# Document Generator

Simple Node.js + Express web app that collects customer info, generates two PDFs (Receipt and Certificate of Ownership) using company-wide constants plus form data, and emails them to the provided address.

## Requirements
- Node.js 18+

## Setup
1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the project root with your SMTP credentials:
```env
PORT=3000
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
MAIL_FROM=Acme Real Estate <no-reply@example.com>
```

3. Start the server (development):
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

## Company Constants
Edit `src/constants.js` to update non-customer data (company name, address, bank details, etc.). These values are used across generated documents.

## Notes
- PDFs are generated in-memory with PDFKit and sent as email attachments via Nodemailer.
- The frontend form posts to `/api/generate` and shows success/failure status in the page.

## Supabase (Option B: Edge Function)
An alternative serverless implementation is included at `supabase/functions/generate-docs/` (Deno + pdf-lib + Supabase Storage + Resend).

Deploy (requires `supabase` CLI):
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set RESEND_API_KEY=... MAIL_FROM="Acme Real Estate <no-reply@example.com>" SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_BUCKET=documents
supabase functions deploy generate-docs --project-ref YOUR_PROJECT_REF
```
Call the function (example):
```bash
curl -X POST "https://YOUR_PROJECT_REF.functions.supabase.co/generate-docs" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"John Doe",
    "phone":"+15551234567",
    "email":"john@example.com",
    "squareMeters":120.5,
    "amount":50000
  }'
```
# subxdocmaker
