// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
	PDFDocument,
	StandardFonts,
	rgb,
} from "https://esm.sh/pdf-lib@1.17.1";
import { Image as Img, Font as ImgFont, RGBA } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

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

async function createImage(width: number, height: number, title: string, lines: string[], output: "png" | "jpg"): Promise<Uint8Array> {
	const img = new Img(width, height);
	img.fill(new RGBA(250, 250, 250, 255));

	// Load a font from Google Fonts (Roboto). Cache behavior is up to the platform.
	const fontUrl = "https://raw.githubusercontent.com/google/fonts/main/apache/roboto/Roboto-Regular.ttf";
	const fontBytes = await (await fetch(fontUrl)).arrayBuffer();
	const fontTitle = await ImgFont.from(fontBytes, 36);
	const fontBody = await ImgFont.from(fontBytes, 22);

	let y = 40;
	await img.print(fontTitle, 40, y, title, new RGBA(0, 0, 0, 255));
	y += 50;
	for (const line of lines) {
		await img.print(fontBody, 40, y, line, new RGBA(30, 30, 30, 255));
		y += 32;
	}

	if (output === "png") return await img.encode();
	return await img.encodeJPEG(0.9);
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

		// Receipt preview: JPG image
		const receiptJpg = await createImage(1100, 800, "Payment Receipt", [
			`Date: ${new Date().toLocaleDateString()}`,
			`Receipt #: ${Date.now()}`,
			`Received from: ${name}`,
			`Phone: ${phone}`,
			`Email: ${email}`,
			`Property Size: ${squareMeters} sq. meters`,
			`Amount Paid: $${Number(amount).toLocaleString()}`,
		], "jpg");

		// Certificate preview: PNG image
		const certPng = await createImage(1100, 800, "Certificate of Ownership", [
			`Project: ${COMPANY.projectName}`,
			`Owner Name: ${name}`,
			`Owner Email: ${email}`,
			`Owner Phone: ${phone}`,
			`Property Size: ${squareMeters} sq. meters`,
			`Consideration Amount: $${Number(amount).toLocaleString()}`,
			`Signed by: ${COMPANY.ceoName}, ${COMPANY.ceoTitle}`,
		], "png");

		// Deed of Assignment preview: PDF
		const deedPdf = await createPdf("Deed of Assignment", [
			`Assignor: ${COMPANY.name}`,
			`Assignee: ${name}`,
			`Project: ${COMPANY.projectName}`,
			`Property Size: ${squareMeters} sq. meters`,
			`Consideration: $${Number(amount).toLocaleString()}`,
			`This deed transfers and assigns all rights, title and interest in the property to the Assignee, subject to applicable laws and covenants.`,
			`Signed by: ${COMPANY.ceoName}, ${COMPANY.ceoTitle}`,
		]);

		return new Response(JSON.stringify({
			ok: true,
			receiptJpgBase64: bytesToBase64(receiptJpg),
			certificatePngBase64: bytesToBase64(certPng),
			deedPdfBase64: bytesToBase64(deedPdf),
		}), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
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


