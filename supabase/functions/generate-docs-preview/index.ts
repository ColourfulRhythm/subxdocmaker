// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
	PDFDocument,
	StandardFonts,
	rgb,
} from "https://esm.sh/pdf-lib@1.17.1";

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
	projectName: "Sunrise Gardens Estate",
	ceoName: "Jane Smith",
	ceoTitle: "Chief Executive Officer",
};

type Payload = {
	name: string;
	phone: string;
	email: string;
	squareMeters: string | number;
	amount: string | number;
};

async function createPdf(title: string, lines: string[]): Promise<Uint8Array> {
	const pdfDoc = await PDFDocument.create();
	const page = pdfDoc.addPage([595.28, 841.89]);
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

serve(async (req) => {
	try {
		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Max-Age": "86400",
		};
		if (req.method === "OPTIONS") {
			return new Response("ok", { headers: corsHeaders });
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
		]);

		const certBytes = await createPdf("Certificate of Ownership", [
			`Project: ${COMPANY.projectName}`,
			`Owner Name: ${name}`,
			`Owner Email: ${email}`,
			`Owner Phone: ${phone}`,
			`Property Size: ${squareMeters} sq. meters`,
			`Consideration Amount: $${Number(amount).toLocaleString()}`,
			`Signed by: ${COMPANY.ceoName}, ${COMPANY.ceoTitle}`,
		]);

		return new Response(JSON.stringify({
			ok: true,
			receiptBase64: bytesToBase64(receiptBytes),
			certificateBase64: bytesToBase64(certBytes),
		}), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
	} catch (err) {
		return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
});


