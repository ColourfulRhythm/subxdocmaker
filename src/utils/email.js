const nodemailer = require('nodemailer');

function createTransport() {
	const host = process.env.SMTP_HOST;
	const port = Number(process.env.SMTP_PORT || 587);
	const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;

	if (!host || !user || !pass) {
		throw new Error('SMTP configuration missing. Please set SMTP_HOST, SMTP_USER, SMTP_PASS.');
	}

	return nodemailer.createTransport({
		host,
		port,
		secure,
		auth: { user, pass },
	});
}

async function sendEmailWithAttachments({ to, subject, text, attachments }) {
	const transporter = createTransport();
	const from = process.env.MAIL_FROM || process.env.SMTP_USER;
	const info = await transporter.sendMail({ from, to, subject, text, attachments });
	return info;
}

module.exports = { sendEmailWithAttachments };


