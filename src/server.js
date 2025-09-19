const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { generateReceiptPdf, generateOwnershipCertificatePdf } = require('./utils/pdf');
const { sendEmailWithAttachments } = require('./utils/email');
const company = require('./constants');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
app.use(express.static(PUBLIC_DIR));

app.get('/health', (_req, res) => {
	return res.json({ ok: true });
});

app.post('/api/generate', async (req, res) => {
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server listening on http://localhost:${PORT}`);
});


