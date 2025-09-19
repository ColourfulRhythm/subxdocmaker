const PDFDocument = require('pdfkit');

function drawHeader(doc, company) {
	doc
		.fontSize(18)
		.text(company.name, { align: 'left' })
		.moveDown(0.2)
		.fontSize(10)
		.text(`${company.addressLine1}, ${company.addressLine2}`)
		.text(`${company.city}, ${company.state} ${company.postalCode}, ${company.country}`)
		.text(`Phone: ${company.phone}  Email: ${company.email}`)
		.text(`Website: ${company.website}`)
		.moveDown();

	doc.moveDown(0.5);
	doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(560, doc.y).stroke();
	doc.moveDown();
}

function drawFooter(doc, company) {
	doc.moveDown();
	doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, 760).lineTo(560, 760).stroke();
	doc
		.fontSize(9)
		.fillColor('#666666')
		.text(`${company.name} | ${company.website} | ${company.email} | ${company.phone}`, 50, 770, { align: 'center' })
		.fillColor('black');
}

function streamToBuffer(stream) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		stream.on('data', (chunk) => chunks.push(chunk));
		stream.on('end', () => resolve(Buffer.concat(chunks)));
		stream.on('error', reject);
	});
}

async function generateReceiptPdf({ company, name, phone, email, squareMeters, amount }) {
	const doc = new PDFDocument({ size: 'A4', margin: 50 });
	const stream = doc.pipe(require('stream').PassThrough());

	drawHeader(doc, company);

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

	doc.fontSize(13).text(`Amount Paid: $${Number(amount).toLocaleString()}`, { continued: false });
	if (company.taxId) {
		doc.fontSize(10).fillColor('#666666').text(`Tax ID: ${company.taxId}`).fillColor('black');
	}

	doc.moveDown();
	doc.text('Payment Method: Bank Transfer');
	doc.text(`Bank: ${company.bank.name}`);
	doc.text(`Account Name: ${company.bank.accountName}`);
	doc.text(`Account Number: ${company.bank.accountNumber}`);
	doc.text(`Routing Number: ${company.bank.routingNumber}`);

	doc.moveDown(2);
	doc.text('Authorized Signature: ______________________');

	drawFooter(doc, company);
	doc.end();

	return await streamToBuffer(stream);
}

async function generateOwnershipCertificatePdf({ company, name, phone, email, squareMeters, amount }) {
	const doc = new PDFDocument({ size: 'A4', margin: 50 });
	const stream = doc.pipe(require('stream').PassThrough());

	drawHeader(doc, company);

	doc.moveDown();
	doc.fontSize(16).text('Certificate of Ownership', { align: 'center' });
	doc.moveDown(1);

	doc.fontSize(12).text(`Project: ${company.projectName}`, { align: 'left' });
	doc.moveDown(0.5);
	doc.fontSize(12).text(`This is to certify that ${name} is recognized as the owner of the property described below:`, { align: 'left' });
	doc.moveDown();

	doc.text(`Owner Name: ${name}`);
	doc.text(`Owner Email: ${email}`);
	doc.text(`Owner Phone: ${phone}`);
	doc.text(`Property Size: ${squareMeters} sq. meters`);
	doc.text(`Consideration Amount: $${Number(amount).toLocaleString()}`);

	doc.moveDown(1);
	doc.text(company.deedText, { align: 'left' });

	doc.moveDown(2);
	doc.text('This certificate is issued by:', { align: 'left' });
	doc.text(`${company.name}`);
	doc.text(`${company.addressLine1}, ${company.addressLine2}`);
	doc.text(`${company.city}, ${company.state} ${company.postalCode}, ${company.country}`);

	doc.moveDown(2);
	doc.text(`Issued on: ${new Date().toLocaleDateString()}`);
	doc.text(`Signed by: ${company.ceoName}, ${company.ceoTitle}`);
	doc.moveDown(2);
	doc.text('Authorized Signature: ______________________');

	drawFooter(doc, company);
	doc.end();

	return await streamToBuffer(stream);
}

module.exports = { generateReceiptPdf, generateOwnershipCertificatePdf };


