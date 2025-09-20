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

async function generateReceiptPdf({ company, name, phone, email, squareMeters, amount, paymentRef }) {
	const doc = new PDFDocument({ size: 'A4', margin: 40 });
	const stream = doc.pipe(require('stream').PassThrough());

	// Receipt header with company branding
	doc.fontSize(20)
		.fillColor('#2c3e50')
		.text(company.name, { align: 'center' })
		.fillColor('black');
	
	doc.moveDown(0.3);
	doc.fontSize(10)
		.fillColor('#7f8c8d')
		.text(`${company.addressLine1}, ${company.addressLine2}`, { align: 'center' })
		.text(`${company.city}, ${company.state} ${company.postalCode}, ${company.country}`, { align: 'center' })
		.text(`Phone: ${company.phone} | Email: ${company.email}`, { align: 'center' })
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
	doc.fontSize(16).fillColor('#27ae60').text(`Amount Paid: ₦${Number(amount).toLocaleString()}`, 70, paymentY + 45);
	doc.fontSize(10).fillColor('#7f8c8d').text(`Tax ID: ${company.taxId}`, 70, paymentY + 70);

	// Payment method section
	doc.moveDown(2);
	doc.rect(50, doc.y, 495, 120).fill('#fff3cd').stroke('#f39c12', 1);
	
	const methodY = doc.y + 15;
	doc.fontSize(14).fillColor('#f39c12').text('PAYMENT METHOD', 70, methodY);
	doc.fontSize(12).fillColor('black');
	doc.text('Bank Transfer', 70, methodY + 25);
	doc.text(`Bank: ${company.bank.name}`, 70, methodY + 45);
	doc.text(`Account Name: ${company.bank.accountName}`, 70, methodY + 65);
	doc.text(`Account Number: ${company.bank.accountNumber}`, 70, methodY + 85);
	doc.text(`Routing Number: ${company.bank.routingNumber}`, 70, methodY + 105);

	// Terms and conditions
	doc.moveDown(2);
	doc.fontSize(10)
		.fillColor('#7f8c8d')
		.text('TERMS & CONDITIONS:', { align: 'left' })
		.text('This receipt serves as proof of payment for the property purchase.', { align: 'left' })
		.text('Please retain this receipt for your records and tax purposes.', { align: 'left' })
		.text('For any inquiries, please contact us using the information above.', { align: 'left' })
		.fillColor('black');

	// Signature section
	doc.moveDown(2);
	doc.text('Authorized Signature: ______________________', 50, doc.y);
	doc.text('Date: ______________________', 300, doc.y);
	
	doc.moveDown(1);
	doc.text('Print Name: ______________________', 50, doc.y);
	doc.text('Title: ______________________', 300, doc.y);

	// Footer with receipt validation
	doc.moveDown(2);
	doc.strokeColor('#bdc3c7').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
	doc.moveDown(0.5);
	
	doc.fontSize(9)
		.fillColor('#7f8c8d')
		.text(`Receipt generated on: ${new Date().toLocaleString()}`, { align: 'center' })
		.text(`Valid for tax purposes | ${company.website}`, { align: 'center' })
		.fillColor('black');

	doc.end();
	return await streamToBuffer(stream);
}

async function generateOwnershipCertificatePdf({ company, name, phone, email, squareMeters, amount }) {
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

	// Company header with better styling
	doc.fontSize(24)
		.fillColor('#2c3e50')
		.text(company.name, { align: 'center' })
		.fillColor('black');
	
	doc.moveDown(0.3);
	doc.fontSize(12)
		.fillColor('#7f8c8d')
		.text(`${company.addressLine1}, ${company.addressLine2}`, { align: 'center' })
		.text(`${company.city}, ${company.state} ${company.postalCode}, ${company.country}`, { align: 'center' })
		.text(`Phone: ${company.phone} | Email: ${company.email}`, { align: 'center' })
		.fillColor('black');

	// Decorative line
	doc.moveDown(1);
	doc.strokeColor('#3498db').lineWidth(2).moveTo(100, doc.y).lineTo(495, doc.y).stroke();
	doc.moveDown(0.5);

	// Certificate title with decorative styling
	doc.fontSize(28)
		.fillColor('#2c3e50')
		.text('CERTIFICATE OF OWNERSHIP', { align: 'center' });
	
	doc.moveDown(0.3);
	doc.fontSize(16)
		.fillColor('#7f8c8d')
		.text('This is to certify that', { align: 'center' })
		.fillColor('black');

	// Owner name with special emphasis
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

	// Property details in a styled box
	doc.moveDown(1.5);
	const boxY = doc.y;
	doc.rect(80, boxY, 435, 120).fill('#f8f9fa').stroke('#bdc3c7', 1);
	
	doc.y = boxY + 20;
	doc.fontSize(14).fillColor('#2c3e50').text('PROPERTY DETAILS', 100, doc.y, { align: 'left' });
	doc.y += 30;
	
	doc.fontSize(12).fillColor('black');
	doc.text(`Project: ${company.projectName}`, 100, doc.y);
	doc.text(`Property Size: ${squareMeters} square meters`, 100, doc.y + 20);
	doc.text(`Consideration Amount: ₦${Number(amount).toLocaleString()}`, 100, doc.y + 40);
	doc.text(`Owner Contact: ${email} | ${phone}`, 100, doc.y + 60);

	doc.y = boxY + 140;

	// Legal text in a more formal style
	doc.moveDown(1);
	doc.fontSize(11)
		.fillColor('#34495e')
		.text(company.deedText, { align: 'justify', lineGap: 2 })
		.fillColor('black');

	// Issuing authority section
	doc.moveDown(2);
	doc.fontSize(12)
		.fillColor('#2c3e50')
		.text('This certificate is issued by:', { align: 'left' });
	
	doc.moveDown(0.3);
	doc.fontSize(14)
		.fillColor('#e74c3c')
		.text(company.name, { align: 'left' });
	
	doc.fontSize(11)
		.fillColor('black')
		.text(`${company.addressLine1}, ${company.addressLine2}`)
		.text(`${company.city}, ${company.state} ${company.postalCode}, ${company.country}`);

	// Signature section
	doc.moveDown(2);
	const signatureY = doc.y;
	doc.text(`Issued on: ${new Date().toLocaleDateString()}`, 100, signatureY);
	doc.text(`Signed by: ${company.ceoName}`, 100, signatureY + 20);
	doc.text(`${company.ceoTitle}`, 100, signatureY + 40);
	
	// Signature line
	doc.moveDown(1);
	doc.text('Authorized Signature: ______________________', 100, doc.y);
	
	// Official seal placeholder
	doc.circle(450, signatureY + 20, 30).stroke('#2c3e50', 2);
	doc.fontSize(8).text('OFFICIAL', 430, signatureY + 15, { align: 'center' });
	doc.text('SEAL', 430, signatureY + 25, { align: 'center' });

	// Footer with certificate number
	doc.moveDown(2);
	doc.fontSize(9)
		.fillColor('#7f8c8d')
		.text(`Certificate No: CERT-${Date.now()}`, { align: 'center' })
		.text(`Valid until: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}`, { align: 'center' })
		.fillColor('black');

	doc.end();
	return await streamToBuffer(stream);
}

module.exports = { generateReceiptPdf, generateOwnershipCertificatePdf };


