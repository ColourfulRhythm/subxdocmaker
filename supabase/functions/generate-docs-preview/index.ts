import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
	PDFDocument,
	StandardFonts,
	rgb,
} from "https://esm.sh/pdf-lib@1.17.1";

const COMPANY = {
	name: "Focal Point Property Development and Management Services Ltd.",
	addressLine1: "2 Seasons, Off Kobape-Abeokuta Expressway",
	addressLine2: "Gbako Village",
	city: "Abeokuta",
	state: "Ogun State",
	postalCode: "110001",
	country: "Nigeria",
	phone: "+234 (0) 123 456 7890",
	email: "info@focalpointproperties.com",
	website: "https://focalpointproperties.com",
	taxId: "TAX-FP-2024-001",
	bank: {
		name: "First Bank of Nigeria",
		accountName: "Focal Point Property Development and Management Services Ltd.",
		accountNumber: "1234567890",
		routingNumber: "0110000",
	},
	projectName: "2 Seasons",
	ceoName: "Tolulope Olugbode",
	ceoTitle: "Founder",
	deedText: "This Deed of Assignment is made on this day, transferring all rights, title, and interest in the property located at 2 Seasons, Off Kobape-Abeokuta Expressway, Gbako Village, Ogun State from Focal Point Property Development and Management Services Ltd. to [Assignee Name], in consideration of the sum of [Amount].",
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

async function createImageAsSVG(title: string, content: string[]): Promise<string> {
	try {
		// Determine if this is a certificate or receipt based on title
		const isCertificate = title.toLowerCase().includes('certificate');
		const isReceipt = title.toLowerCase().includes('receipt');
		
		let svgContent = '';
		
		if (isCertificate) {
			// Enhanced certificate SVG design
			svgContent = `
				<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
					<!-- Background -->
					<rect width="100%" height="100%" fill="#ffffff" stroke="#2c3e50" stroke-width="4"/>
					<rect x="10" y="10" width="780" height="580" fill="none" stroke="#34495e" stroke-width="1"/>
					
					<!-- Corner decorations -->
					<rect x="10" y="10" width="20" height="20" fill="#2c3e50"/>
					<rect x="770" y="10" width="20" height="20" fill="#2c3e50"/>
					<rect x="10" y="570" width="20" height="20" fill="#2c3e50"/>
					<rect x="770" y="570" width="20" height="20" fill="#2c3e50"/>
					
					<!-- Company header -->
					<text x="400" y="50" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#2c3e50" text-anchor="middle">${COMPANY.name}</text>
					<text x="400" y="75" font-family="Arial, sans-serif" font-size="12" fill="#7f8c8d" text-anchor="middle">${COMPANY.addressLine1}, ${COMPANY.addressLine2}</text>
					<text x="400" y="95" font-family="Arial, sans-serif" font-size="12" fill="#7f8c8d" text-anchor="middle">${COMPANY.city}, ${COMPANY.state} ${COMPANY.postalCode}, ${COMPANY.country}</text>
					
					<!-- Decorative line -->
					<line x1="100" y1="120" x2="700" y2="120" stroke="#3498db" stroke-width="2"/>
					
					<!-- Certificate title -->
					<text x="400" y="160" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#2c3e50" text-anchor="middle">CERTIFICATE OF OWNERSHIP</text>
					<text x="400" y="190" font-family="Arial, sans-serif" font-size="16" fill="#7f8c8d" text-anchor="middle">This is to certify that</text>
					
					<!-- Owner name (highlighted) -->
					<text x="400" y="220" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#e74c3c" text-anchor="middle">${content[1]?.replace('Owner Name: ', '') || 'Property Owner'}</text>
					<text x="400" y="250" font-family="Arial, sans-serif" font-size="14" fill="#7f8c8d" text-anchor="middle">is recognized as the legal owner of the property described below:</text>
					
					<!-- Property details box -->
					<rect x="80" y="280" width="640" height="120" fill="#f8f9fa" stroke="#bdc3c7" stroke-width="1"/>
					<text x="100" y="305" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#2c3e50">PROPERTY DETAILS</text>
					<text x="100" y="330" font-family="Arial, sans-serif" font-size="12" fill="#000">${content[0]?.replace('Project: ', 'Project: ') || 'Project: ' + COMPANY.projectName}</text>
					<text x="100" y="355" font-family="Arial, sans-serif" font-size="12" fill="#000">${content[4]?.replace('Property Size: ', 'Property Size: ') || 'Property Size: '}</text>
					<text x="100" y="380" font-family="Arial, sans-serif" font-size="12" fill="#000">${content[5]?.replace('Consideration Amount: ', 'Consideration Amount: ') || 'Consideration Amount: '}</text>
					
					<!-- Legal text -->
					<text x="100" y="430" font-family="Arial, sans-serif" font-size="11" fill="#34495e">This certificate affirms the holder's ownership rights over the described property,</text>
					<text x="100" y="450" font-family="Arial, sans-serif" font-size="11" fill="#34495e">subject to applicable laws, regulations, and the governing covenants of the development.</text>
					
					<!-- Issuing authority -->
					<text x="100" y="490" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#2c3e50">This certificate is issued by:</text>
					<text x="100" y="515" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#e74c3c">${COMPANY.name}</text>
					
					<!-- Signature area -->
					<text x="100" y="550" font-family="Arial, sans-serif" font-size="12" fill="#000">Signed by: ${COMPANY.ceoName}, ${COMPANY.ceoTitle}</text>
					<text x="100" y="570" font-family="Arial, sans-serif" font-size="12" fill="#000">Date: ${new Date().toLocaleDateString()}</text>
					
					<!-- Official seal -->
					<circle cx="650" cy="520" r="30" fill="none" stroke="#2c3e50" stroke-width="2"/>
					<text x="650" y="515" font-family="Arial, sans-serif" font-size="8" fill="#2c3e50" text-anchor="middle">OFFICIAL</text>
					<text x="650" y="525" font-family="Arial, sans-serif" font-size="8" fill="#2c3e50" text-anchor="middle">SEAL</text>
				</svg>
			`;
		} else if (isReceipt) {
			// Enhanced receipt SVG design
			svgContent = `
				<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
					<!-- Background -->
					<rect width="100%" height="100%" fill="#ffffff" stroke="#ddd" stroke-width="1"/>
					
					<!-- Company header -->
					<text x="400" y="40" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#2c3e50" text-anchor="middle">${COMPANY.name}</text>
					<text x="400" y="60" font-family="Arial, sans-serif" font-size="10" fill="#7f8c8d" text-anchor="middle">${COMPANY.addressLine1}, ${COMPANY.addressLine2}</text>
					<text x="400" y="80" font-family="Arial, sans-serif" font-size="10" fill="#7f8c8d" text-anchor="middle">${COMPANY.city}, ${COMPANY.state} ${COMPANY.postalCode}, ${COMPANY.country}</text>
					
					<!-- Receipt title -->
					<line x1="50" y1="110" x2="750" y2="110" stroke="#3498db" stroke-width="2"/>
					<text x="400" y="140" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#2c3e50" text-anchor="middle">PAYMENT RECEIPT</text>
					<text x="400" y="165" font-family="Arial, sans-serif" font-size="12" fill="#7f8c8d" text-anchor="middle">Receipt #: RCP-${Date.now()}</text>
					<text x="400" y="185" font-family="Arial, sans-serif" font-size="12" fill="#7f8c8d" text-anchor="middle">Date: ${new Date().toLocaleDateString()}</text>
					
					<!-- Customer information box -->
					<rect x="50" y="210" width="700" height="80" fill="#f8f9fa" stroke="#bdc3c7" stroke-width="1"/>
					<text x="70" y="235" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#2c3e50">CUSTOMER INFORMATION</text>
					<text x="70" y="260" font-family="Arial, sans-serif" font-size="12" fill="#000">${content[2]?.replace('Received from: ', 'Name: ') || 'Name: '}</text>
					<text x="70" y="280" font-family="Arial, sans-serif" font-size="12" fill="#000">${content[3]?.replace('Phone: ', 'Phone: ') || 'Phone: '}</text>
					
					<!-- Payment details box -->
					<rect x="50" y="310" width="700" height="100" fill="#e8f5e8" stroke="#27ae60" stroke-width="1"/>
					<text x="70" y="335" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#27ae60">PAYMENT DETAILS</text>
					<text x="70" y="360" font-family="Arial, sans-serif" font-size="12" fill="#000">${content[5]?.replace('Property Size: ', 'Property Size: ') || 'Property Size: '}</text>
					<text x="70" y="380" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#27ae60">${content[6]?.replace('Amount Paid: ', 'Amount Paid: ') || 'Amount Paid: '}</text>
					<text x="70" y="400" font-family="Arial, sans-serif" font-size="10" fill="#7f8c8d">Tax ID: ${COMPANY.taxId}</text>
					
					<!-- Payment method box -->
					<rect x="50" y="430" width="700" height="120" fill="#fff3cd" stroke="#f39c12" stroke-width="1"/>
					<text x="70" y="455" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#f39c12">PAYMENT METHOD</text>
					<text x="70" y="480" font-family="Arial, sans-serif" font-size="12" fill="#000">Bank Transfer</text>
					<text x="70" y="500" font-family="Arial, sans-serif" font-size="12" fill="#000">Bank: ${COMPANY.bank.name}</text>
					<text x="70" y="520" font-family="Arial, sans-serif" font-size="12" fill="#000">Account: ${COMPANY.bank.accountName}</text>
					<text x="70" y="540" font-family="Arial, sans-serif" font-size="12" fill="#000">Account #: ${COMPANY.bank.accountNumber}</text>
					
					<!-- Footer -->
					<line x1="50" y1="570" x2="750" y2="570" stroke="#bdc3c7" stroke-width="1"/>
					<text x="400" y="590" font-family="Arial, sans-serif" font-size="9" fill="#7f8c8d" text-anchor="middle">Valid for tax purposes | ${COMPANY.website}</text>
				</svg>
			`;
		} else {
			// Default design for other documents
		const lines = content.map((line, index) => 
			`<text x="40" y="${80 + (index * 25)}" font-family="Arial, sans-serif" font-size="14" fill="#333">${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>`
		).join('\n');
		
			svgContent = `
			<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
				<rect width="100%" height="100%" fill="#fafafa" stroke="#ddd" stroke-width="2"/>
				<text x="40" y="40" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#000">${title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>
				${lines}
			</svg>
		`;
		}
		
		// Return SVG as base64
		return btoa(svgContent);
	} catch (error) {
		console.error("SVG creation error:", error);
		throw new Error("Failed to create SVG");
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

		// Create content for each document
		const receiptContent = [
			`Date: ${new Date().toLocaleDateString()}`,
			`Receipt #: ${Date.now()}`,
			`Received from: ${name}`,
			`Phone: ${phone}`,
			`Email: ${email}`,
			`Property Size: ${squareMeters} sq. meters`,
			`Amount Paid: ₦${Number(amount).toLocaleString()}`,
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
			`Consideration Amount: ₦${Number(amount).toLocaleString()}`,
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
			`Consideration: ₦${Number(amount).toLocaleString()}`,
			``,
			`This deed transfers and assigns all rights, title and interest`,
			`in the property to the Assignee, subject to applicable laws`,
			`and covenants.`,
			``,
			`Signed by: ${COMPANY.ceoName}, ${COMPANY.ceoTitle}`,
			`Date: ${new Date().toLocaleDateString()}`,
		];

		// Generate documents - using SVG for images (works reliably in browsers)
		const [receiptSvgBase64, certificateSvgBase64, deedPdfBytes] = await Promise.all([
			createImageAsSVG("Payment Receipt", receiptContent),
			createImageAsSVG("Certificate of Ownership", certificateContent),
			createSimplePdf("Deed of Assignment", deedContent),
		]);

		return new Response(JSON.stringify({
			ok: true,
			receiptJpgBase64: receiptSvgBase64, // Return as JPG base64 but it's SVG
			certificatePngBase64: certificateSvgBase64, // Return as PNG base64 but it's SVG
			deedPdfBase64: bytesToBase64(deedPdfBytes),
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