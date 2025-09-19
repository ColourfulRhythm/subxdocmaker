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
};

const COMPANY = {
	name: "Acme Real Estate Ltd.",
	addressLine1: "123 Market Street",
	addressLine2: "Central Business District",
	city: "Metropolis",
	state: "CA",
	postalCode: "90001",
	country: "USA",
	phone: "+1 (555) 123-4567",
	email: "support@acme-realestate.com",
	website: "https://acme-realestate.com",
	taxId: "TAX-ACME-0001",
	bank: {
		name: "First National Bank",
		accountName: "Acme Real Estate Ltd.",
		accountNumber: "1234567890",
		routingNumber: "1100000",
	},
};

async function createPdf(title: string, lines: string[]): Promise<Uint8Array> {
	const pdfDoc = await PDFDocument.create();
	const page = pdfDoc.addPage([595.28, 841.89]); // A4
	const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const { width, height } = page.getSize();
	const margin = 50;
	let y = height - margin;

	page.drawText(COMPANY.name, { x: margin, y, size: 18, font, color: rgb(0, 0, 0) });
	y -= 22;
	page.drawText(`${COMPANY.addressLine1}, ${COMPANY.addressLine2}`, { x: margin, y, size: 10, font });
	y -= 14;
	page.drawText(`${COMPANY.city}, ${COMPANY.state} ${COMPANY.postalCode}, ${COMPANY.country}`, { x: margin, y, size: 10, font });
	y -= 14;
	page.drawText(`Phone: ${COMPANY.phone}  Email: ${COMPANY.email}`, { x: margin, y, size: 10, font });
	y -= 14;
	page.drawText(`Website: ${COMPANY.website}`, { x: margin, y, size: 10, font });
	y -= 24;

	page.drawText(title, { x: margin, y, size: 16, font });
	y -= 20;

	for (const line of lines) {
		page.drawText(line, { x: margin, y, size: 12, font });
		y -= 16;
	}

	y -= 20;
	page.drawText(`${COMPANY.name} | ${COMPANY.website} | ${COMPANY.email} | ${COMPANY.phone}`,
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

async function sendEmail({ to, name, receiptBase64, certBase64 }: { to: string; name: string; receiptBase64: string; certBase64: string; }) {
	const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
	const MAIL_FROM = Deno.env.get("MAIL_FROM") || "no-reply@example.com";
	if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");

	const subject = `${COMPANY.name} - Your Documents`;
	const text = `Dear ${name},\n\nAttached are your receipt and certificate of ownership.\n\nRegards,\n${COMPANY.name}`;

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
			attachments: [
				{ filename: "receipt.pdf", content: receiptBase64 },
				{ filename: "certificate.pdf", content: certBase64 },
			],
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
		const { name, phone, email, squareMeters, amount } = payload;
		if (!name || !phone || !email || !squareMeters || !amount) {
			return new Response(JSON.stringify({ ok: false, error: "Missing required fields" }), { status: 400, headers: { "Content-Type": "application/json" } });
		}

		const receiptBytes = await createPdf("Payment Receipt", [
			`Date: ${new Date().toLocaleDateString()}`,
			`Receipt #: ${Date.now()}`,
			`Received from: ${name}`,
			`Phone: ${phone}`,
			`Email: ${email}`,
			`Property Size: ${squareMeters} sq. meters`,
			`Amount Paid: $${Number(amount).toLocaleString()}`,
			`Payment Method: Bank Transfer`,
			`Bank: ${COMPANY.bank.name}`,
			`Account Name: ${COMPANY.bank.accountName}`,
			`Account Number: ${COMPANY.bank.accountNumber}`,
			`Routing Number: ${COMPANY.bank.routingNumber}`,
		]);

		const certBytes = await createPdf("Certificate of Ownership", [
			`This certifies that ${name} is recognized as the owner of the property:`,
			`Owner Name: ${name}`,
			`Owner Email: ${email}`,
			`Owner Phone: ${phone}`,
			`Property Size: ${squareMeters} sq. meters`,
			`Consideration Amount: $${Number(amount).toLocaleString()}`,
			`Issued on: ${new Date().toLocaleDateString()}`,
		]);

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

		try {
			const r1 = await supabase.storage.from(SUPABASE_BUCKET).upload(receiptPath, receiptBytes, {
				contentType: "application/pdf",
				upsert: true,
			});
			if (r1.error) throw new Error(`storage_upload_receipt: ${r1.error.message}`);
			const r2 = await supabase.storage.from(SUPABASE_BUCKET).upload(certPath, certBytes, {
				contentType: "application/pdf",
				upsert: true,
			});
			if (r2.error) throw new Error(`storage_upload_certificate: ${r2.error.message}`);
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
			});
		} catch (e) {
			console.log('db insert error:', e);
		}

		// Email attachments as base64 via Resend
		const receiptBase64 = bytesToBase64(receiptBytes);
		const certBase64 = bytesToBase64(certBytes);
		try {
			await sendEmail({ to: email, name, receiptBase64, certBase64 });
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


