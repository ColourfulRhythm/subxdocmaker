const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

// Company constants
const COMPANY = {
	name: 'Focal Point Property Development and Management Services Ltd.',
	addressLine1: '2 Seasons, Off Kobape-Abeokuta Expressway',
	addressLine2: 'Gbako Village',
	city: 'Abeokuta',
	state: 'Ogun State',
	country: 'Nigeria',
	phone: '+234 (0) 707 167 0649',
	email: 'subx@focalpointdev.com',
	website: 'www.subxhq.com',
	taxId: 'TAX-FP-2024-001',
	projectName: '2 Seasons',
	ceoName: 'Tolulope Olugbode',
	ceoTitle: 'Founder',
	bank: {
		name: 'ZENITH BANK',
		accountName: 'Focal Point Property Development and Management Services Ltd.',
		accountNumber: '1228540598',
	},
};

// API Key for security (set in Vercel environment variables)
const API_KEY = process.env.API_KEY || 'your-secret-api-key-here';

// Email configuration (using Resend via HTTP API for Vercel)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAIL_FROM = process.env.MAIL_FROM || 'subx@subxhq.com';

function streamToBuffer(stream) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		stream.on('data', (chunk) => chunks.push(chunk));
		stream.on('end', () => resolve(Buffer.concat(chunks)));
		stream.on('error', reject);
	});
}

async function generateReceiptPdf({ name, phone, email, squareMeters, amount, paymentRef }) {
	const doc = new PDFDocument({ size: 'A4', margin: 40 });
	const stream = doc.pipe(require('stream').PassThrough());

	// Receipt header with company branding
	doc.fontSize(20)
		.fillColor('#2c3e50')
		.text(COMPANY.name, { align: 'center' })
		.fillColor('black');
	
	doc.moveDown(0.3);
	doc.fontSize(10)
		.fillColor('#7f8c8d')
		.text(`${COMPANY.addressLine1}, ${COMPANY.addressLine2}`, { align: 'center' })
		.text(`${COMPANY.city}, ${COMPANY.state}, ${COMPANY.country}`, { align: 'center' })
		.text(`Email: ${COMPANY.email} | Website: ${COMPANY.website}`, { align: 'center' })
		.fillColor('black');

	// Receipt title and number
	doc.moveDown(1.5);
	doc.strokeColor('#3498db').lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
	doc.moveDown(0.5);
	
	doc.fontSize(24)
		.fillColor('#2c3e50')
		.text('PAYMENT RECEIPT', { align: 'center' })
		.fillColor('black');
	
	doc.moveDown(0.3);
	doc.fontSize(12)
		.fillColor('#7f8c8d')
		.text(`Receipt #: RCP-${Date.now()}`, { align: 'center' })
		.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'center' })
		.text(`Payment Ref #: ${paymentRef || '-'}`, { align: 'center' })
		.fillColor('black');

	// Customer information section
	doc.moveDown(1.5);
	doc.rect(50, doc.y, 495, 80).fill('#f8f9fa').stroke('#bdc3c7', 1);
	
	const customerY = doc.y + 15;
	doc.fontSize(14).fillColor('#2c3e50').text('CUSTOMER INFORMATION', 70, customerY);
	doc.fontSize(12).fillColor('black');
	doc.text(`Name: ${name}`, 70, customerY + 25);
	doc.text(`Phone: ${phone}`, 70, customerY + 45);
	doc.text(`Email: ${email}`, 70, customerY + 65);

	// Payment details section
	doc.moveDown(2);
	doc.rect(50, doc.y, 495, 100).fill('#e8f5e8').stroke('#27ae60', 1);
	
	const paymentY = doc.y + 15;
	doc.fontSize(14).fillColor('#27ae60').text('PAYMENT DETAILS', 70, paymentY);
	doc.fontSize(12).fillColor('black');
	doc.text(`Property Size: ${squareMeters} square meters`, 70, paymentY + 25);
	doc.fontSize(16).fillColor('#27ae60').text(`Amount Paid: N${Number(amount).toLocaleString()}`, 70, paymentY + 45);
	doc.fontSize(10).fillColor('#7f8c8d').text(`Tax ID: ${COMPANY.taxId}`, 70, paymentY + 70);

	// Payment method section
	doc.moveDown(2);
	doc.rect(50, doc.y, 495, 120).fill('#fff3cd').stroke('#f39c12', 1);
	
	const methodY = doc.y + 15;
	doc.fontSize(14).fillColor('#f39c12').text('PAYMENT METHOD', 70, methodY);
	doc.fontSize(12).fillColor('black');
	doc.text('Bank Transfer', 70, methodY + 25);
	doc.text(`Bank: ${COMPANY.bank.name}`, 70, methodY + 45);
	doc.text(`Account Name: ${COMPANY.bank.accountName}`, 70, methodY + 65);
	doc.text(`Account Number: ${COMPANY.bank.accountNumber}`, 70, methodY + 85);

	// Footer
	doc.moveDown(2);
	doc.strokeColor('#bdc3c7').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
	doc.moveDown(0.5);
	
	doc.fontSize(9)
		.fillColor('#7f8c8d')
		.text(`Receipt generated on: ${new Date().toLocaleString()}`, { align: 'center' })
		.text(`Valid for tax purposes | ${COMPANY.website}`, { align: 'center' })
		.fillColor('black');

	doc.end();
	return await streamToBuffer(stream);
}

async function generateCertificatePdf({ name, phone, email, squareMeters, amount }) {
	const doc = new PDFDocument({ size: 'A4', margin: 40 });
	const stream = doc.pipe(require('stream').PassThrough());

	// Draw decorative border
	doc.rect(30, 30, 535, 782).stroke('#2c3e50', 3);
	doc.rect(40, 40, 515, 762).stroke('#34495e', 1);
	
	// Add corner decorations
	const cornerSize = 20;
	doc.rect(30, 30, cornerSize, cornerSize).fill('#2c3e50');
	doc.rect(545, 30, cornerSize, cornerSize).fill('#2c3e50');
	doc.rect(30, 792, cornerSize, cornerSize).fill('#2c3e50');
	doc.rect(545, 792, cornerSize, cornerSize).fill('#2c3e50');

	// Company header
	doc.fontSize(24)
		.fillColor('#2c3e50')
		.text(COMPANY.name, { align: 'center' })
		.fillColor('black');
	
	doc.moveDown(0.3);
	doc.fontSize(12)
		.fillColor('#7f8c8d')
		.text(`${COMPANY.addressLine1}, ${COMPANY.addressLine2}`, { align: 'center' })
		.text(`${COMPANY.city}, ${COMPANY.state}, ${COMPANY.country}`, { align: 'center' })
		.text(`Email: ${COMPANY.email} | Website: ${COMPANY.website}`, { align: 'center' })
		.fillColor('black');

	// Decorative line
	doc.moveDown(1);
	doc.strokeColor('#3498db').lineWidth(2).moveTo(100, doc.y).lineTo(495, doc.y).stroke();
	doc.moveDown(0.5);

	// Certificate title
	doc.fontSize(28)
		.fillColor('#2c3e50')
		.text('CERTIFICATE OF OWNERSHIP', { align: 'center' });
	
	doc.moveDown(0.3);
	doc.fontSize(16)
		.fillColor('#7f8c8d')
		.text('This is to certify that', { align: 'center' })
		.fillColor('black');

	// Owner name
	doc.moveDown(0.5);
	doc.fontSize(20)
		.fillColor('#e74c3c')
		.text(name, { align: 'center' })
		.fillColor('black');

	doc.moveDown(0.3);
	doc.fontSize(14)
		.fillColor('#7f8c8d')
		.text('is recognized as the legal owner of the property described below:', { align: 'center' })
		.fillColor('black');

	// Property details box
	doc.moveDown(1.5);
	const boxY = doc.y;
	doc.rect(80, boxY, 435, 120).fill('#f8f9fa').stroke('#bdc3c7', 1);
	
	doc.y = boxY + 20;
	doc.fontSize(14).fillColor('#2c3e50').text('PROPERTY DETAILS', 100, doc.y, { align: 'left' });
	doc.y += 30;
	
	doc.fontSize(12).fillColor('black');
	doc.text(`Project: ${COMPANY.projectName}`, 100, doc.y);
	doc.text(`Property Size: ${squareMeters} square meters`, 100, doc.y + 20);
	doc.text(`Consideration Amount: N${Number(amount).toLocaleString()}`, 100, doc.y + 40);
	doc.text(`Owner Contact: ${email} | ${phone}`, 100, doc.y + 60);

	doc.y = boxY + 140;

	// Signature section
	doc.moveDown(2);
	const signatureY = doc.y;
	doc.text(`Issued on: ${new Date().toLocaleDateString()}`, 100, signatureY);
	doc.text(`Signed by: ${COMPANY.ceoName}`, 100, signatureY + 20);
	doc.text(`${COMPANY.ceoTitle}`, 100, signatureY + 40);
	
	// Official seal
	doc.circle(450, signatureY + 20, 30).stroke('#2c3e50', 2);
	doc.fontSize(8).text('OFFICIAL', 430, signatureY + 15, { align: 'center' });
	doc.text('SEAL', 430, signatureY + 25, { align: 'center' });

	// Footer
	doc.moveDown(2);
	doc.fontSize(9)
		.fillColor('#7f8c8d')
		.text(`Certificate No: CERT-${Date.now()}`, { align: 'center' })
		.fillColor('black');

	doc.end();
	return await streamToBuffer(stream);
}

async function generateDeedPdf({ name, squareMeters, amount }) {
	const doc = new PDFDocument({ size: 'A4', margin: 50 });
	const stream = doc.pipe(require('stream').PassThrough());

	const currentDate = new Date();
	const day = currentDate.getDate();
	const month = currentDate.toLocaleString('default', { month: 'long' });
	const year = currentDate.getFullYear();
	const rcNumber = "RC-1234567";

	doc.fontSize(18).text('DEED OF SALE', { align: 'center' });
	doc.moveDown();
	
	doc.fontSize(10);
	doc.text(`THIS DEED OF ASSIGNMENT is made this ${day} day of ${month}, ${year} BETWEEN:`);
	doc.moveDown();
	doc.text(`(1) FOCAL POINT PROPERTY DEVELOPMENT AND MANAGEMENT SERVICES LTD., a company incorporated under the laws of the Federal Republic of Nigeria with RC No. ${rcNumber} and having its registered office at 2 Seasons, Off Kobape-Abeokuta Expressway, Gbako Village, Ogun State (hereinafter referred to as the "Assignor" or "FOCAL POINT"); and`);
	doc.moveDown();
	doc.text(`(2) ${name.toUpperCase()} (hereinafter referred to as the "Assignee").`);
	doc.moveDown(2);
	
	doc.fontSize(12).text('RECITALS', { underline: true });
	doc.moveDown();
	doc.fontSize(10);
	doc.text(`A. The Assignor is the registered owner/developer of a parcel of land known as 2 Seasons, Off Kobape-Abeokuta Expressway, Gbako Village, Ogun State ("the Project" or "the Plot").`);
	doc.moveDown();
	doc.text(`B. The Assignor has created a scheme of sub-ownership whereby the Assignor sells individual square-metre units (each being "1 sqm") of the said Plot to purchasers, subject to the terms, conditions and restrictions set out in this Deed.`);
	doc.moveDown();
	doc.text(`C. The Assignee has agreed to purchase from the Assignor and the Assignor has agreed to sell to the Assignee a total of ${squareMeters} square metres (hereinafter referred to as the "Subject Units" or "the Units") of the Plot, being part of the said Plot, for the sum of ${Number(amount).toLocaleString()} Naira (N${Number(amount).toLocaleString()}) (the "Purchase Price").`);
	doc.moveDown(2);
	
	doc.text('NOW THIS DEED WITNESSES as follows:');
	doc.moveDown(2);
	
	// Key clauses
	doc.text('1. TRANSFER AND ASSIGNMENT');
	doc.moveDown();
	doc.text('   In consideration of the Purchase Price (receipt of which the Assignor hereby acknowledges), the Assignor hereby assigns, conveys and transfers to the Assignee all the Assignor\'s rights, title and interest in and to the Subject Units tied to the Project. The Assignee shall be entitled to possess and enjoy the Subject Units as legal owner, subject to the terms and covenants contained in this Deed.');
	doc.moveDown();
	
	doc.text('2. NATURE OF OWNERSHIP');
	doc.moveDown();
	doc.text('   Ownership is by square metre (sqm) and is tied to the identified Plot. It is not a free-standing parcel separate from the Project until such time as the Assignor or relevant authority effects registration or consolidation.');
	doc.moveDown();
	
	doc.text('3. WAIT/LOCK-IN PERIOD');
	doc.moveDown();
	doc.text('   The Assignee shall not sell, assign, transfer, or otherwise dispose of the Subject Units for a period of twenty-four (24) months from the date of this Deed, except with the prior written consent of the Assignor. Any attempted transfer contrary to this clause shall be null and void.');
	doc.moveDown();
	
	doc.text('4. RESTRICTIONS ON RESALE');
	doc.moveDown();
	doc.text('   After the Wait Period, no resale or transfer of the Subject Units may occur without the express written permission of the Assignor. The Assignor reserves a right of first refusal on any resale.');
	doc.moveDown();
	
	doc.text('5. TITLE AND WARRANTIES');
	doc.moveDown();
	doc.text('   The Assignor warrants that it has good title to the Plot and full power to sell the Subject Units. The Assignee accepts that the Units are subject to applicable laws, development covenants, and Project rules.');
	doc.moveDown();
	
	doc.text('6. GOVERNING LAW');
	doc.moveDown();
	doc.text('   This Deed shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria, with jurisdiction in the courts of Ogun State.');
	doc.moveDown(2);
	
	// Signatures
	doc.text('IN WITNESS WHEREOF the parties hereto have executed this Deed on the Date first above written.');
	doc.moveDown(2);
	doc.text('SIGNED by or on behalf of:');
	doc.text('FOCAL POINT PROPERTY DEVELOPMENT AND MANAGEMENT SERVICES LTD.');
	doc.text('______________________________');
	doc.text(`Name: ${COMPANY.ceoName}`);
	doc.text(`Title: ${COMPANY.ceoTitle}`);
	doc.text(`Date: ${currentDate.toLocaleDateString()}`);
	doc.moveDown(2);
	doc.text(`SIGNED by: ${name.toUpperCase()}`);
	doc.text('______________________________');

	doc.end();
	return await streamToBuffer(stream);
}

async function sendEmailViaResend({ to, name, receiptPdf, certificatePdf, deedPdf }) {
	if (!RESEND_API_KEY) {
		throw new Error('RESEND_API_KEY not configured');
	}

	const subject = `${COMPANY.name} - Your Property Documents`;
	const text = `Dear ${name},\n\nThank you for your purchase. Attached are your property documents:\n- Payment Receipt\n- Certificate of Ownership\n- Deed of Sale\n\nPlease keep these documents safe for your records.\n\nRegards,\n${COMPANY.name}`;

	const response = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${RESEND_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			from: MAIL_FROM,
			to: to,
			subject: subject,
			text: text,
			attachments: [
				{ filename: 'receipt.pdf', content: receiptPdf.toString('base64') },
				{ filename: 'certificate.pdf', content: certificatePdf.toString('base64') },
				{ filename: 'deed-of-sale.pdf', content: deedPdf.toString('base64') },
			],
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Email sending failed: ${response.status} - ${errorText}`);
	}

	return await response.json();
}

// Main API Handler
module.exports = async function handler(req, res) {
	// Enable CORS
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

	// Handle OPTIONS preflight
	if (req.method === 'OPTIONS') {
		return res.status(200).end();
	}

	// Only allow POST
	if (req.method !== 'POST') {
		return res.status(405).json({ 
			success: false, 
			error: 'Method not allowed. Use POST.' 
		});
	}

	try {
		// API Key authentication
		const providedKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
		if (providedKey !== API_KEY) {
			return res.status(401).json({ 
				success: false, 
				error: 'Unauthorized. Invalid API key.' 
			});
		}

		// Validate required fields
		const { name, phone, email, squareMeters, amount, paymentRef } = req.body;
		
		if (!name || !phone || !email || !squareMeters || !amount) {
			return res.status(400).json({ 
				success: false, 
				error: 'Missing required fields: name, phone, email, squareMeters, amount' 
			});
		}

		// Generate PDFs
		const receiptPdf = await generateReceiptPdf({ 
			name, 
			phone, 
			email, 
			squareMeters, 
			amount, 
			paymentRef: paymentRef || `PAY-${Date.now()}` 
		});
		
		const certificatePdf = await generateCertificatePdf({ 
			name, 
			phone, 
			email, 
			squareMeters, 
			amount 
		});
		
		const deedPdf = await generateDeedPdf({ 
			name, 
			squareMeters, 
			amount 
		});

		// Send email with attachments
		await sendEmailViaResend({ 
			to: email, 
			name, 
			receiptPdf, 
			certificatePdf, 
			deedPdf 
		});

		// Return success response
		return res.status(200).json({
			success: true,
			message: 'Documents generated and sent successfully',
			documentsGenerated: ['receipt', 'certificate', 'deed-of-sale'],
			recipient: email,
			timestamp: new Date().toISOString()
		});

	} catch (error) {
		console.error('API Error:', error);
		return res.status(500).json({
			success: false,
			error: error.message || 'Internal server error',
			timestamp: new Date().toISOString()
		});
	}
};

