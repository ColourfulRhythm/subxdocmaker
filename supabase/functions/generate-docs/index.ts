// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
	PDFDocument,
	StandardFonts,
	rgb,
} from "https://esm.sh/pdf-lib@1.17.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Payload = {
	name: string;
	phone: string;
	email: string;
	squareMeters: string | number;
	amount: string | number;
	paymentRef?: string;
	// Optional pre-rendered client assets
	receiptPngBase64?: string;
	certPngBase64?: string;
};

const COMPANY = {
	name: "Focal Point Property Development and Management Services Ltd.",
	addressLine1: "2 Seasons, Off Kobape-Abeokuta Expressway",
	addressLine2: "Gbako Village",
	city: "Abeokuta",
	state: "Ogun State",
	//postalCode: "110001",
	country: "Nigeria",
	phone: "+234 (0) 707 167 0649",
	email: "subx@focalpointdev.com",
	website: "https://subxhq.com",
	//taxId: "TAX-FP-2024-001",
	bank: {
		name: "ZENITH BANK",
		accountName: "Focal Point Property Development and Management Services Ltd.",
		accountNumber: "1228540598",
		routingNumber: "0110000",
	},
};

type PdfFooterOverrides = { website?: string; email?: string; includePhone?: boolean };

async function createPdf(title: string, lines: string[], footerOverrides?: PdfFooterOverrides): Promise<Uint8Array> {
	const pdfDoc = await PDFDocument.create();
	let page = pdfDoc.addPage([595.28, 841.89]); // A4
	const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const { width, height } = page.getSize();
	const margin = 50;
	const lineHeight = 12;
	const fontSize = 10;
	let y = height - margin;

	// Header
	page.drawText(COMPANY.name, { x: margin, y, size: 18, font, color: rgb(0, 0, 0) });
	y -= 22;
	page.drawText(`${COMPANY.addressLine1}, ${COMPANY.addressLine2}`, { x: margin, y, size: 10, font });
	y -= 14;
	page.drawText(`${COMPANY.city}, ${COMPANY.state}, ${COMPANY.country}`, { x: margin, y, size: 10, font });
	y -= 14;
	const includePhone = footerOverrides?.includePhone !== false;
	if (includePhone) {
		page.drawText(`Phone: ${COMPANY.phone}  Email: ${footerOverrides?.email || COMPANY.email}`, { x: margin, y, size: 10, font });
	} else {
		page.drawText(`Email: ${footerOverrides?.email || COMPANY.email}`, { x: margin, y, size: 10, font });
	}
	y -= 14;
	page.drawText(`Website: ${footerOverrides?.website || COMPANY.website}`, { x: margin, y, size: 10, font });
	y -= 24;

	// Title
	page.drawText(title, { x: margin, y, size: 16, font });
	y -= 20;

	// Content with page breaks
	for (const line of lines) {
		// Check if we need a new page
		if (y < margin + lineHeight) {
			page = pdfDoc.addPage([595.28, 841.89]);
			y = height - margin;
		}
		
		// Skip empty lines but still advance y
		if (line.trim() === '') {
			y -= lineHeight;
			continue;
		}
		
		// Handle long lines by wrapping
		const maxWidth = width - (margin * 2);
		const words = line.split(' ');
		let currentLine = '';
		
		for (const word of words) {
			const testLine = currentLine + (currentLine ? ' ' : '') + word;
			const textWidth = font.widthOfTextAtSize(testLine, fontSize);
			
			if (textWidth > maxWidth && currentLine) {
				// Draw current line and start new line
				page.drawText(currentLine, {
					x: margin,
					y: y,
					size: fontSize,
					font: font,
					color: rgb(0, 0, 0),
				});
				y -= lineHeight;
				currentLine = word;
				
				// Check if we need a new page after drawing
				if (y < margin + lineHeight) {
					page = pdfDoc.addPage([595.28, 841.89]);
					y = height - margin;
				}
			} else {
				currentLine = testLine;
			}
		}
		
		// Draw the remaining line
		if (currentLine) {
			page.drawText(currentLine, {
				x: margin,
				y: y,
				size: fontSize,
				font: font,
				color: rgb(0, 0, 0),
			});
			y -= lineHeight;
		}
	}

	// Footer on last page
	y -= 20;
	const footerWebsite = footerOverrides?.website || COMPANY.website;
	const footerEmail = footerOverrides?.email || COMPANY.email;
	const footerLine = includePhone
		? `${COMPANY.name} | ${footerWebsite} | ${footerEmail} | ${COMPANY.phone}`
		: `${COMPANY.name} | ${footerWebsite} | ${footerEmail}`;
	page.drawText(footerLine,
		{ x: margin, y, size: 9, font, color: rgb(0.3, 0.3, 0.3) });

	const bytes = await pdfDoc.save();
	return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
	let binary = "";
	const chunkSize = 0x8000;
	for (let i = 0; i < bytes.length; i += chunkSize) {
		const chunk = bytes.subarray(i, i + chunkSize);
		binary += String.fromCharCode.apply(null, Array.from(chunk) as unknown as number[]);
	}
	// deno-lint-ignore no-deprecated-deno-api
	return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
	// deno-lint-ignore no-deprecated-deno-api
	const binary = atob(base64);
	const len = binary.length;
	const bytes = new Uint8Array(len);
	for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

async function sendEmail({ to, name, attachments }: { to: string; name: string; attachments: { filename: string; content: string }[] }) {
	const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
	const MAIL_FROM = Deno.env.get("MAIL_FROM") || "no-reply@example.com";
	if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");

	const subject = `${COMPANY.name} - Your Documents`;
    const text = `Dear ${name},\n\nAttached are your receipt, certificate of ownership, and deed of sale.\n\nRegards,\n${COMPANY.name}`;

	const resp = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			"Authorization": `Bearer ${RESEND_API_KEY}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from: MAIL_FROM,
			to: to,
			subject,
			text,
            attachments,
		}),
	});
	if (!resp.ok) {
		const body = await resp.text();
		throw new Error(`Resend error ${resp.status}: ${body}`);
	}
}

serve(async (req) => {
	try {
		const reqAllowHeaders = req.headers.get("access-control-request-headers") || "authorization, x-client-info, apikey, content-type";
		const reqAllowMethod = req.headers.get("access-control-request-method") || "POST";
		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Headers": reqAllowHeaders,
			"Access-Control-Allow-Methods": `${reqAllowMethod}, OPTIONS`,
			"Access-Control-Max-Age": "86400",
		};
		if (req.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: corsHeaders });
		}
		if (req.method !== "POST") {
			return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
		}
		const payload = (await req.json()) as Payload;
		const { name, phone, email, squareMeters, amount, paymentRef, receiptPngBase64, certPngBase64 } = payload;
		if (!name || !phone || !email || !squareMeters || !amount) {
			return new Response(JSON.stringify({ ok: false, error: "Missing required fields" }), { status: 400, headers: { "Content-Type": "application/json" } });
		}

        // Only generate PDFs if PNGs are not provided
        let receiptBytes: Uint8Array | null = null;
        let certBytes: Uint8Array | null = null;
        
        if (!receiptPngBase64) {
            receiptBytes = await createPdf("Payment Receipt", [
			`Date: ${new Date().toLocaleDateString()}`,
			`Receipt #: ${Date.now()}`,
                `Payment Ref #: ${paymentRef || '-'}`,
			`Received from: ${name}`,
			`Phone: ${phone}`,
			`Email: ${email}`,
			`Property Size: ${squareMeters} sq. meters`,
                `Amount Paid: N${Number(amount).toLocaleString()}`,
			`Payment Method: Bank Transfer`,
			`Bank: ${COMPANY.bank.name}`,
			`Account Name: ${COMPANY.bank.accountName}`,
			`Account Number: ${COMPANY.bank.accountNumber}`,
			`Routing Number: ${COMPANY.bank.routingNumber}`,
            ], { website: 'www.subxhq.com', email: 'subx@focalpointdev.com', includePhone: false });
        }

        if (!certPngBase64) {
            certBytes = await createPdf("Certificate of Ownership", [
			`This certifies that ${name} is recognized as the owner of the property:`,
			`Owner Name: ${name}`,
			`Owner Email: ${email}`,
			`Owner Phone: ${phone}`,
			`Property Size: ${squareMeters} sq. meters`,
                `Consideration Amount: N${Number(amount).toLocaleString()}`,
			`Issued on: ${new Date().toLocaleDateString()}`,
            ], { website: 'www.subxhq.com', email: 'subx@focalpointdev.com', includePhone: false });
        }

        const currentDate = new Date();
        const day = currentDate.getDate();
        const month = currentDate.toLocaleString('default', { month: 'long' });
        const year = currentDate.getFullYear();
        const rcNumber = "RC-1234567"; // You may want to make this configurable
        const plotReference = `PLOT-${Date.now().toString().slice(-6)}`;
        
        const deedBytes = await createPdf("Deed of Sale", [
            `DEED OF SALE`,
            ``,
            `THIS DEED OF ASSIGNMENT is made this ${day} day of ${month}, ${year} BETWEEN:`,
            ``,
            `(1) FOCAL POINT PROPERTY DEVELOPMENT AND MANAGEMENT SERVICES LTD., a company`,
            `incorporated under the laws of the Federal Republic of Nigeria with RC No. ${rcNumber}`,
            `and having its registered office at 2 Seasons, Off Kobape-Abeokuta Expressway,`,
            `Gbako Village, Ogun State (hereinafter referred to as the "Assignor" or "FOCAL POINT"); and`,
            ``,
            `(2) ${name.toUpperCase()}, of [Assignee Address] (hereinafter referred to as the "Assignee").`,
            ``,
            `RECITALS`,
            ``,
            `A. The Assignor is the registered owner/developer of a parcel of land known as`,
            `2 Seasons, Off Kobape-Abeokuta Expressway, Gbako Village, Ogun State`,
            `("the Project" or "the Plot").`,
            ``,
            `B. The Assignor has created a scheme of sub-ownership whereby the Assignor sells`,
            `individual square-metre units (each being "1 sqm") of the said Plot to purchasers,`,
            `subject to the terms, conditions and restrictions set out in this Deed.`,
            ``,
            `C. The Assignee has agreed to purchase from the Assignor and the Assignor has`,
            `agreed to sell to the Assignee a total of ${squareMeters} square metres`,
            `(hereinafter referred to as the "Subject Units" or "the Units") of the Plot,`,
            `being part of the said Plot, for the sum of ${Number(amount).toLocaleString()} Naira`,
            `(N${Number(amount).toLocaleString()}) (the "Purchase Price").`,
            ``,
            `NOW THIS DEED WITNESSES as follows:`,
            ``,
            `1. TRANSFER AND ASSIGNMENT`,
            `   In consideration of the Purchase Price (receipt of which the Assignor hereby`,
            `acknowledges), the Assignor hereby assigns, conveys and transfers to the Assignee`,
            `all the Assignor's rights, title and interest in and to the Subject Units tied`,
            `to the Project. The Assignee shall be entitled to possess and enjoy the Subject`,
            `Units as legal owner, subject to the terms and covenants contained in this Deed.`,
            ``,
            `2. NATURE OF OWNERSHIP`,
            `   Ownership is by square metre (sqm) and is tied to the identified Plot. It is`,
            `not a free-standing parcel separate from the Project until such time as the`,
            `Assignor or relevant authority effects registration or consolidation.`,
            ``,
            `3. WAIT/LOCK-IN PERIOD`,
            `   The Assignee shall not sell, assign, transfer, or otherwise dispose of the`,
            `Subject Units for a period of twenty-four (24) months from the date of this Deed,`,
            `except with the prior written consent of the Assignor. Any attempted transfer`,
            `contrary to this clause shall be null and void.`,
            ``,
            `4. RESTRICTIONS ON RESALE`,
            `   After the Wait Period, no resale or transfer of the Subject Units may occur`,
            `without the express written permission of the Assignor. The Assignor reserves a`,
            `right of first refusal on any resale.`,
            ``,
            `5. TITLE AND WARRANTIES`,
            `   The Assignor warrants that it has good title to the Plot and full power to`,
            `sell the Subject Units. The Assignee accepts that the Units are subject to`,
            `applicable laws, development covenants, and Project rules.`,
            ``,
            `6. GOVERNING LAW`,
            `   This Deed shall be governed by and construed in accordance with the laws of`,
            `the Federal Republic of Nigeria, with jurisdiction in the courts of Ogun State.`,
            ``,
            `IN WITNESS WHEREOF the parties hereto have executed this Deed on the Date first`,
            `above written.`,
            ``,
            `SIGNED by or on behalf of:`,
            `FOCAL POINT PROPERTY DEVELOPMENT AND MANAGEMENT SERVICES LTD.`,
            `______________________________`,
            `Signature: _____________________`,
            `Name: ${COMPANY.ceoName}`,
            `Title: ${COMPANY.ceoTitle}`,
            `Date: ${currentDate.toLocaleDateString()}`,
            ``,
            `SIGNED by:`,
            `${name.toUpperCase()}`,
            `______________________________`,
            `Signature: _____________________`,
            `Name: ${name}`,
            `Date: ${currentDate.toLocaleDateString()}`,
        ], { website: 'www.subxhq.com', email: 'subx@focalpointdev.com', includePhone: false });

		const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
		const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
		const SUPABASE_BUCKET = Deno.env.get("SUPABASE_BUCKET") || "documents";
		if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
			throw new Error("config: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set");
		}
		const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

		// Ensure bucket exists (idempotent)
		try {
			// @ts-ignore createBucket exists on storage admin
			// If bucket already exists, this will error; ignore that
			// deno-lint-ignore no-explicit-any
			const rCreate: any = await (supabase as any).storage.createBucket?.(SUPABASE_BUCKET, { public: false });
			if (rCreate && rCreate.error && !String(rCreate.error.message || "").includes("already exists")) {
				throw rCreate.error;
			}
		} catch (_e) { /* ignore if bucket exists */ }

		const folder = `${Date.now()}-${email.replaceAll(/[^a-zA-Z0-9._-]/g, "_")}`;
		const receiptPath = `${folder}/receipt.pdf`;
		const certPath = `${folder}/certificate.pdf`;
        const deedPath = `${folder}/deed-of-sale.pdf`;

		try {
			// Only upload PDFs if they were generated
			if (receiptBytes) {
			const r1 = await supabase.storage.from(SUPABASE_BUCKET).upload(receiptPath, receiptBytes, {
				contentType: "application/pdf",
				upsert: true,
			});
			if (r1.error) throw new Error(`storage_upload_receipt: ${r1.error.message}`);
			}
            if (certBytes) {
			const r2 = await supabase.storage.from(SUPABASE_BUCKET).upload(certPath, certBytes, {
				contentType: "application/pdf",
				upsert: true,
			});
			if (r2.error) throw new Error(`storage_upload_certificate: ${r2.error.message}`);
			}
            const r3 = await supabase.storage.from(SUPABASE_BUCKET).upload(deedPath, deedBytes, {
                contentType: "application/pdf",
                upsert: true,
            });
            if (r3.error) throw new Error(`storage_upload_deed: ${r3.error.message}`);
		} catch (e) {
			throw new Error(`storage: ${String((e as Error).message || e)}`);
		}

		// Optional DB insert: store submission metadata (does not fail the whole request)
		try {
			await supabase.from('submissions').insert({
				name,
				phone,
				email,
				square_meters: Number(squareMeters),
				amount: Number(amount),
				receipt_path: receiptPath,
				certificate_path: certPath,
                deed_path: deedPath,
			});
		} catch (e) {
			console.log('db insert error:', e);
		}

		// Email attachments as base64 via Resend
		const attachments: { filename: string; content: string }[] = [];
		if (receiptPngBase64) {
			attachments.push({ filename: 'receipt.png', content: receiptPngBase64 });
		} else if (receiptBytes) {
			attachments.push({ filename: 'receipt.pdf', content: bytesToBase64(receiptBytes) });
		}
		if (certPngBase64) {
			attachments.push({ filename: 'certificate.png', content: certPngBase64 });
		} else if (certBytes) {
			attachments.push({ filename: 'certificate.pdf', content: bytesToBase64(certBytes) });
		}
		attachments.push({ filename: 'deed-of-sale.pdf', content: bytesToBase64(deedBytes) });
		try {
			await sendEmail({ to: email, name, attachments });
		} catch (e) {
			throw new Error(`email: ${String((e as Error).message || e)}`);
		}

		return new Response(JSON.stringify({ ok: true, message: "Documents generated, stored, and emailed." }), {
			status: 200,
			headers: { "Content-Type": "application/json", ...corsHeaders },
		});
	} catch (err) {
		const reqAllowHeaders = req.headers.get("access-control-request-headers") || "authorization, x-client-info, apikey, content-type";
		const reqAllowMethod = req.headers.get("access-control-request-method") || "POST";
		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Headers": reqAllowHeaders,
			"Access-Control-Allow-Methods": `${reqAllowMethod}, OPTIONS`,
			"Access-Control-Max-Age": "86400",
		};
		return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), {
			status: 500,
			headers: { "Content-Type": "application/json", ...corsHeaders },
		});
	}
});


