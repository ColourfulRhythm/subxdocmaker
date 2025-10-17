# API Documentation: Generate and Send Documents

## Endpoint
```
POST /api/generate-and-send
```

## Authentication
Include your API key in the request headers:
```
X-API-Key: your-secret-api-key
```
OR
```
Authorization: Bearer your-secret-api-key
```

## Request Body
```json
{
  "name": "John Doe",
  "phone": "+2348012345678",
  "email": "john.doe@example.com",
  "squareMeters": "150",
  "amount": "2000000",
  "paymentRef": "PAY-123456" // Optional
}
```

## Response

### Success (200)
```json
{
  "success": true,
  "message": "Documents generated and sent successfully",
  "documentsGenerated": ["receipt", "certificate", "deed-of-sale"],
  "recipient": "john.doe@example.com",
  "timestamp": "2025-10-07T06:56:31.000Z"
}
```

### Error (400/401/500)
```json
{
  "success": false,
  "error": "Error message here",
  "timestamp": "2025-10-07T06:56:31.000Z"
}
```

## Environment Variables (Set in Vercel)
```bash
API_KEY=your-secret-api-key-here
RESEND_API_KEY=re_YRkNYfmu_AfrMUUFrnrYGKrHPkyEuCHBf
MAIL_FROM=subx@subxhq.com
SUPABASE_URL=https://kdisvxgqqskpxgxzbbet.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
```

### How to Get Supabase Service Key:
1. Go to: https://supabase.com/dashboard/project/kdisvxgqqskpxgxzbbet/settings/api
2. Copy the **service_role** key (not the anon key)
3. Add it to Vercel environment variables as `SUPABASE_SERVICE_KEY`

## Example Usage

### cURL
```bash
curl -X POST https://subxdocmaker.vercel.app/api/generate-and-send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-api-key" \
  -d '{
    "name": "John Doe",
    "phone": "+2348012345678",
    "email": "john.doe@example.com",
    "squareMeters": "150",
    "amount": "2000000",
    "paymentRef": "PAY-123456"
  }'
```

### JavaScript/Node.js
```javascript
const response = await fetch('https://subxdocmaker.vercel.app/api/generate-and-send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-secret-api-key'
  },
  body: JSON.stringify({
    name: 'John Doe',
    phone: '+2348012345678',
    email: 'john.doe@example.com',
    squareMeters: '150',
    amount: '2000000',
    paymentRef: 'PAY-123456'
  })
});

const result = await response.json();
console.log(result);
```

### Python
```python
import requests

response = requests.post(
    'https://subxdocmaker.vercel.app/api/generate-and-send',
    headers={
        'Content-Type': 'application/json',
        'X-API-Key': 'your-secret-api-key'
    },
    json={
        'name': 'John Doe',
        'phone': '+2348012345678',
        'email': 'john.doe@example.com',
        'squareMeters': '150',
        'amount': '2000000',
        'paymentRef': 'PAY-123456'
    }
)

print(response.json())
```

## Integration with Payment App

After a successful payment in your main app:

```javascript
// When payment is successful
async function onPaymentSuccess(paymentData) {
  try {
    const response = await fetch('https://subxdocmaker.vercel.app/api/generate-and-send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.DOCUMENT_API_KEY
      },
      body: JSON.stringify({
        name: paymentData.customerName,
        phone: paymentData.customerPhone,
        email: paymentData.customerEmail,
        squareMeters: paymentData.propertySqm,
        amount: paymentData.amountPaid,
        paymentRef: paymentData.transactionId
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Documents sent to customer:', result.recipient);
    } else {
      console.error('Document generation failed:', result.error);
    }
  } catch (error) {
    console.error('API call failed:', error);
  }
}
```

## Security Notes

1. **API Key**: Set a strong API key in Vercel environment variables
2. **HTTPS Only**: API should only be called over HTTPS
3. **Rate Limiting**: Consider adding rate limiting in production
4. **Logging**: Monitor API calls for suspicious activity
5. **Email Validation**: Validate email addresses before sending

## Documents Generated

The API automatically generates and emails three documents:

1. **receipt.pdf** - Professional payment receipt with company branding
2. **certificate.pdf** - Certificate of ownership with decorative border and seal
3. **deed-of-sale.pdf** - Comprehensive legal deed of sale document

All documents are professionally formatted with the company's branding and information.

## Document Storage & Record-Keeping

### Automatic Backup to Supabase
All generated PDFs are automatically stored in Supabase Storage:
- **Location**: `documents/{timestamp}-{email}/`
- **Files Stored**: receipt.pdf, certificate.pdf, deed-of-sale.pdf
- **Database Record**: Customer info saved in `submissions` table

### What's Stored:
- **Supabase Storage Bucket**: `documents`
  - Each customer gets a unique folder: `{timestamp}-{sanitized-email}`
  - Example: `1759820191234-john_doe_example_com/receipt.pdf`
  
- **Supabase Database Table**: `submissions`
  - Customer name, email, phone
  - Square meters, amount, payment reference
  - Paths to all 3 PDF files
  - Timestamp of generation

### Accessing Stored Documents:
1. **Supabase Dashboard**: https://supabase.com/dashboard/project/kdisvxgqqskpxgxzbbet/storage/buckets/documents
2. **Via API**: Use Supabase Storage API to retrieve files
3. **Download**: Can download any document from the dashboard

### Benefits:
- ✅ **Audit Trail**: Every document generation is logged
- ✅ **Customer Support**: Easy to resend documents if customer loses them
- ✅ **Compliance**: All records stored for legal/tax purposes
- ✅ **Backup**: Redundant copies in case of email issues

### Database Schema (submissions table):
```sql
CREATE TABLE submissions (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  square_meters NUMERIC,
  amount NUMERIC,
  receipt_path TEXT,
  certificate_path TEXT,
  deed_path TEXT,
  payment_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

