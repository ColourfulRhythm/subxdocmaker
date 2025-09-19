const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');

// Company constants
const company = {
	name: 'Acme Real Estate Ltd.',
	addressLine1: '123 Market Street',
	addressLine2: 'Central Business District',
	city: 'Metropolis',
	state: 'CA',
	postalCode: '90001',
	country: 'USA',
	phone: '+1 (555) 123-4567',
	email: 'support@acme-realestate.com',
	website: 'https://acme-realestate.com',
	taxId: 'TAX-ACME-0001',
	projectName: 'Sunrise Gardens Estate',
	ceoName: 'Jane Smith',
	ceoTitle: 'Chief Executive Officer',
	deedText:
		"This certificate affirms the holder's ownership rights over the described property, subject to applicable laws, regulations, and the governing covenants of the development. The rights conveyed herein include quiet enjoyment and transfer, consistent with local statutes and any registered encumbrances. This document is issued by the company as evidence of such ownership.",
	bank: {
		name: 'First National Bank',
		accountName: 'Acme Real Estate Ltd.',
		accountNumber: '1234567890',
		routingNumber: '1100000',
	},
};

// PDF utils
const PDFDocument = require('pdfkit');
const stream = require('stream');

function drawHeader(doc, companyData) {
	doc
		.fontSize(18)
		.text(companyData.name, { align: 'left' })
		.moveDown(0.2)
		.fontSize(10)
		.text(`${companyData.addressLine1}, ${companyData.addressLine2}`)
		.text(`${companyData.city}, ${companyData.state} ${companyData.postalCode}, ${companyData.country}`)
		.text(`Phone: ${companyData.phone}  Email: ${companyData.email}`)
		.text(`Website: ${companyData.website}`)
		.moveDown();

	doc.moveDown(0.5);
	doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(560, doc.y).stroke();
	doc.moveDown();
}

function drawFooter(doc, companyData) {
	doc.moveDown();
	doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, 760).lineTo(560, 760).stroke();
	doc
		.fontSize(9)
		.fillColor('#666666')
		.text(`${companyData.name} | ${companyData.website} | ${companyData.email} | ${companyData.phone}`, 50, 770, { align: 'center' })
		.fillColor('black');
}

function streamToBuffer(readable) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		readable.on('data', (chunk) => chunks.push(chunk));
		readable.on('end', () => resolve(Buffer.concat(chunks)));
		readable.on('error', reject);
	});
}

async function generateReceiptPdf({ company: c, name, phone, email, squareMeters, amount }) {
	const doc = new PDFDocument({ size: 'A4', margin: 50 });
	const pass = new stream.PassThrough();
	const piped = doc.pipe(pass);

	drawHeader(doc, c);
	doc.moveDown();
	doc.fontSize(16).text('Payment Receipt', { align: 'right' });
	doc.moveDown();
	doc.fontSize(12);
	doc.text(`Date: ${new Date().toLocaleDateString()}`);
	doc.text(`Receipt #: ${Date.now()}`);
	doc.moveDown();
	doc.text(`Received from: ${name}`);
	doc.text(`Phone: ${phone}`);
	doc.text(`Email: ${email}`);
	doc.text(`Property Size: ${squareMeters} sq. meters`);
	doc.moveDown();
	doc.fontSize(13).text(`Amount Paid: $${Number(amount).toLocaleString()}`);
	if (c.taxId) doc.fontSize(10).fillColor('#666666').text(`Tax ID: ${c.taxId}`).fillColor('black');
	doc.moveDown();
	doc.text('Payment Method: Bank Transfer');
	doc.text(`Bank: ${c.bank.name}`);
	doc.text(`Account Name: ${c.bank.accountName}`);
	doc.text(`Account Number: ${c.bank.accountNumber}`);
	doc.text(`Routing Number: ${c.bank.routingNumber}`);
	doc.moveDown(2);
	doc.text('Authorized Signature: ______________________');
	drawFooter(doc, c);
	doc.end();
	return await streamToBuffer(piped);
}

async function generateOwnershipCertificatePdf({ company: c, name, phone, email, squareMeters, amount }) {
	const doc = new PDFDocument({ size: 'A4', margin: 50 });
	const pass = new stream.PassThrough();
	const piped = doc.pipe(pass);
	drawHeader(doc, c);
	doc.moveDown();
	doc.fontSize(16).text('Certificate of Ownership', { align: 'center' });
	doc.moveDown(1);
	doc.fontSize(12).text(`Project: ${c.projectName}`);
	doc.moveDown(0.5);
	doc.fontSize(12).text(`This is to certify that ${name} is recognized as the owner of the property described below:`);
	doc.moveDown();
	doc.text(`Owner Name: ${name}`);
	doc.text(`Owner Email: ${email}`);
	doc.text(`Owner Phone: ${phone}`);
	doc.text(`Property Size: ${squareMeters} sq. meters`);
	doc.text(`Consideration Amount: $${Number(amount).toLocaleString()}`);
	doc.moveDown(1);
	doc.text(c.deedText);
	doc.moveDown(2);
	doc.text('This certificate is issued by:');
	doc.text(`${c.name}`);
	doc.text(`${c.addressLine1}, ${c.addressLine2}`);
	doc.text(`${c.city}, ${c.state} ${c.postalCode}, ${c.country}`);
	doc.moveDown(2);
	doc.text(`Issued on: ${new Date().toLocaleDateString()}`);
	doc.text(`Signed by: ${c.ceoName}, ${c.ceoTitle}`);
	doc.moveDown(2);
	doc.text('Authorized Signature: ______________________');
	drawFooter(doc, c);
	doc.end();
	return await streamToBuffer(piped);
}

// Email util (via SMTP). Use Firebase secrets to set envs.
const nodemailer = require('nodemailer');
function createTransport() {
	// Read from env first, then fallback to Firebase functions config if set
	let cfg = {};
	try { cfg = functions.config ? functions.config() : {}; } catch (_) { cfg = {}; }
	const host = process.env.SMTP_HOST || (cfg.smtp && cfg.smtp.host);
	const port = Number(process.env.SMTP_PORT || (cfg.smtp && cfg.smtp.port) || 587);
	const secure = String(process.env.SMTP_SECURE || (cfg.smtp && cfg.smtp.secure) || 'false').toLowerCase() === 'true';
	const user = process.env.SMTP_USER || (cfg.smtp && cfg.smtp.user);
	const pass = process.env.SMTP_PASS || (cfg.smtp && cfg.smtp.pass);
	if (!host || !user || !pass) throw new Error('SMTP configuration missing');
	return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}
async function sendEmailWithAttachments({ to, subject, text, attachments }) {
	const transporter = createTransport();
	let cfg = {};
	try { cfg = functions.config ? functions.config() : {}; } catch (_) { cfg = {}; }
	const from = process.env.MAIL_FROM || (cfg.mail && cfg.mail.from) || process.env.SMTP_USER;
	return transporter.sendMail({ from, to, subject, text, attachments });
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post(['/api/generate', '/generate'], async (req, res) => {
	try {
		const { name, phone, email, squareMeters, amount } = req.body;
		if (!name || !phone || !email || !squareMeters || !amount) {
			return res.status(400).json({ ok: false, error: 'Missing required fields' });
		}
		const receiptBuffer = await generateReceiptPdf({ company, name, phone, email, squareMeters, amount });
		const certBuffer = await generateOwnershipCertificatePdf({ company, name, phone, email, squareMeters, amount });
		await sendEmailWithAttachments({
			to: email,
			subject: `${company.name} - Your Documents`,
			text: `Dear ${name},\n\nAttached are your receipt and certificate of ownership.\n\nRegards,\n${company.name}`,
			attachments: [
				{ filename: 'receipt.pdf', content: receiptBuffer },
				{ filename: 'certificate.pdf', content: certBuffer },
			],
		});
		return res.json({ ok: true, message: 'Documents generated and emailed successfully.' });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ ok: false, error: 'Internal server error' });
	}
});

app.post(['/api/preview', '/preview'], async (req, res) => {
	try {
		const { name, phone, email, squareMeters, amount } = req.body;
		if (!name || !phone || !email || !squareMeters || !amount) {
			return res.status(400).json({ ok: false, error: 'Missing required fields' });
		}
		const receiptBuffer = await generateReceiptPdf({ company, name, phone, email, squareMeters, amount });
		const certBuffer = await generateOwnershipCertificatePdf({ company, name, phone, email, squareMeters, amount });
		return res.json({ ok: true, receiptBase64: receiptBuffer.toString('base64'), certificateBase64: certBuffer.toString('base64') });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ ok: false, error: 'Internal server error' });
	}
});

exports.api = functions.https.onRequest(app);


