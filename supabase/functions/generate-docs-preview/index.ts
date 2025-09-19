import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
	bank: {
		name: "First National Bank",
		accountName: "Acme Real Estate Ltd.",
		accountNumber: "1234567890",
		routingNumber: "1100000",
	},
	projectName: "Grand View Estates",
	ceoName: "Jane Doe",
	ceoTitle: "Chief Executive Officer",
	deedText: "This Deed of Assignment is made on this day, transferring all rights, title, and interest in the property located at [Property Address] from [Assignor Name] to [Assignee Name], in consideration of the sum of [Amount].",
};

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
};

function bytesToBase64(bytes: Uint8Array): string {
	// deno-lint-ignore no-deprecated-deno-api
	const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
	// deno-lint-ignore no-deprecated-deno-api
	return btoa(binary);
}

async function createSimplePdf(title: string, content: string[]): Promise<Uint8Array> {
	try {
		const pdfDoc = await PDFDocument.create();
		const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
		const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
		
		const page = pdfDoc.addPage([595, 842]); // A4 size
		const { width, height } = page.getSize();
		
		let y = height - 50;
		
		// Title
		page.drawText(title, {
			x: 50,
			y: y,
			size: 24,
			font: boldFont,
			color: rgb(0, 0, 0),
		});
		y -= 50;
		
		// Content
		for (const line of content) {
			page.drawText(line, {
				x: 50,
				y: y,
				size: 12,
				font: font,
				color: rgb(0, 0, 0),
			});
			y -= 25;
		}
		
		return await pdfDoc.save();
	} catch (error) {
		console.error("PDF creation error:", error);
		throw new Error("Failed to create PDF");
	}
}

serve(async (req) => {
	// Handle CORS preflight
	if (req.method === "OPTIONS") {
		return new Response(null, { status: 204, headers: corsHeaders });
	}

	try {
		if (req.method !== "POST") {
			return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
				status: 405,
				headers: { "Content-Type": "application/json", ...corsHeaders },
			});
		}

		const payload = await req.json();
		const { name, phone, email, squareMeters, amount } = payload;
		
		if (!name || !phone || !email || !squareMeters || !amount) {
			return new Response(JSON.stringify({ ok: false, error: "Missing required fields" }), {
				status: 400,
				headers: { "Content-Type": "application/json", ...corsHeaders },
			});
		}

		// Create all three PDFs
		const receiptContent = [
			`Date: ${new Date().toLocaleDateString()}`,
			`Receipt #: ${Date.now()}`,
			`Received from: ${name}`,
			`Phone: ${phone}`,
			`Email: ${email}`,
			`Property Size: ${squareMeters} sq. meters`,
			`Amount Paid: $${Number(amount).toLocaleString()}`,
			``,
			`Company: ${COMPANY.name}`,
			`Address: ${COMPANY.addressLine1}`,
			`${COMPANY.city}, ${COMPANY.state} ${COMPANY.postalCode}`,
			`Phone: ${COMPANY.phone}`,
			`Email: ${COMPANY.email}`,
		];

		const certificateContent = [
			`Project: ${COMPANY.projectName}`,
			`Owner Name: ${name}`,
			`Owner Email: ${email}`,
			`Owner Phone: ${phone}`,
			`Property Size: ${squareMeters} sq. meters`,
			`Consideration Amount: $${Number(amount).toLocaleString()}`,
			``,
			`This certificate confirms ownership of the above property`,
			`in the ${COMPANY.projectName} development.`,
			``,
			`Signed by: ${COMPANY.ceoName}, ${COMPANY.ceoTitle}`,
			`Company: ${COMPANY.name}`,
			`Date: ${new Date().toLocaleDateString()}`,
		];

		const deedContent = [
			`Assignor: ${COMPANY.name}`,
			`Assignee: ${name}`,
			`Property: ${COMPANY.projectName} - ${squareMeters} sq. meters`,
			`Consideration: $${Number(amount).toLocaleString()}`,
			``,
			`This deed transfers and assigns all rights, title and interest`,
			`in the property to the Assignee, subject to applicable laws`,
			`and covenants.`,
			``,
			`Signed by: ${COMPANY.ceoName}, ${COMPANY.ceoTitle}`,
			`Date: ${new Date().toLocaleDateString()}`,
		];

		// Generate all PDFs
		const [receiptPdf, certificatePdf, deedPdf] = await Promise.all([
			createSimplePdf("Payment Receipt", receiptContent),
			createSimplePdf("Certificate of Ownership", certificateContent),
			createSimplePdf("Deed of Assignment", deedContent),
		]);

		return new Response(JSON.stringify({
			ok: true,
			receiptBase64: bytesToBase64(receiptPdf),
			certificateBase64: bytesToBase64(certificatePdf),
			deedPdfBase64: bytesToBase64(deedPdf),
		}), {
			status: 200,
			headers: { "Content-Type": "application/json", ...corsHeaders },
		});

	} catch (error) {
		console.error("Preview generation error:", error);
		return new Response(JSON.stringify({
			ok: false,
			error: error instanceof Error ? error.message : "Unknown error occurred",
		}), {
			status: 500,
			headers: { "Content-Type": "application/json", ...corsHeaders },
		});
	}
});