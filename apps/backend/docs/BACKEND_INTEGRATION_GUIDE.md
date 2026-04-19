# Backend Integration Guide

This guide shows how to integrate your main backend application with the Email Notification Service.

## Architecture Overview

```
```

## Authentication

All API calls require both Service Key and Service ID headers:

```bash
X-Service-Key: your_api_key_here
X-Service-Id: your_service_id_here
```

**Important**: Both headers are required for all API requests. The Service ID must match the one associated with your API key.

## Base URL

```
http://notification_app:8001/api  # Docker container name
# or
http://localhost:8001/api         # Local development
```

## 1. Organization & Domain Setup

### Step 1: Create Organization (One-time setup)

```bash
# Manual setup via seed script or admin panel
# Organization ID: org_test_123
# API Key: generated_api_key_here
```

### Step 2: Add Client Domain

```bash
POST /internal/v1/organizations/{orgId}/domains
X-Service-Key: your_api_key
X-Service-Id: your_service_id
Content-Type: application/json

{
  "domain": "mail.clientdomain.com",
  "isPrimary": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "domain_uuid",
    "domain": "mail.clientdomain.com",
    "status": "PENDING",
    "isPrimary": true,
    "isVerified": false
  }
}
```

### Step 3: Get DNS Records

```bash
GET /internal/v1/organizations/{orgId}/domains/{domainId}/dns-records
X-Service-Key: your_api_key
X-Service-Id: your_service_id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "domain": "mail.clientdomain.com",
    "requiredRecords": [
      {
        "type": "TXT",
        "name": "_notification-verify.mail.clientdomain.com",
        "value": "notification-verify=abc123..."
      }
    ],
    "optionalRecords": [
      {
        "type": "CNAME",
        "name": "bounce.mail.clientdomain.com",
        "value": "bounce.nexmun.in"
      }
    ]
  }
}
```

### Step 4: Verify Domain

```bash
POST /internal/v1/organizations/{orgId}/domains/{domainId}/verify
X-Service-Key: your_api_key
X-Service-Id: your_service_id
```

## 2. Email Sending Integration

### Basic Email Sending

```bash
POST /internal/v1/organizations/{orgId}/emails/send
X-Service-Key: your_api_key
X-Service-Id: your_service_id
Content-Type: application/json

{
  "to": "user@example.com",
  "from": "noreply@mail.clientdomain.com",
  "subject": "Welcome to our platform",
  "html": "<h1>Welcome!</h1><p>Thanks for signing up.</p>",
  "text": "Welcome! Thanks for signing up."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "email_job_uuid",
    "status": "QUEUED",
    "to": "user@example.com",
    "subject": "Welcome to our platform",
    "createdAt": "2025-08-24T07:30:00.000Z"
  }
}
```

### Automatic Fallback to nexmun.in Domain

If you provide a non-existent `organizationId`, the system automatically falls back to the verified `nexmun.in` domain:

```bash
POST /internal/v1/organizations/non-existent-org-id/emails/send
X-Service-Key: your_api_key
X-Service-Id: your_service_id
Content-Type: application/json

{
  "to": "user@example.com",
  "from": "support",
  "subject": "Your email",
  "text": "This will be sent from support@nexmun.in"
}
```

**Result**: Email sent successfully from `support@nexmun.in` instead of failing with "Organization not found".

## 3. Backend Integration Examples

### Node.js/Express Integration

```javascript
// email-service.js
class EmailNotificationService {
  constructor(baseUrl, apiKey, serviceId, organizationId) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.serviceId = serviceId;
    this.organizationId = organizationId;
  }

  async sendEmail(emailData) {
    const response = await fetch(`${this.baseUrl}/internal/v1/organizations/${this.organizationId}/emails/send`, {
      method: 'POST',
      headers: {
        'X-Service-Key': this.apiKey,
        'X-Service-Id': this.serviceId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      throw new Error(`Email service error: ${response.status}`);
    }

    return await response.json();
  }

  async getDomains() {
    const response = await fetch(`${this.baseUrl}/internal/v1/organizations/${this.organizationId}/domains`, {
      method: 'GET',
      headers: {
        'X-Service-Key': this.apiKey,
        'X-Service-Id': this.serviceId,
      },
    });

    return await response.json();
  }

  async addDomain(domain) {
    const response = await fetch(`${this.baseUrl}/internal/v1/organizations/${this.organizationId}/domains`, {
      method: 'POST',
      headers: {
        'X-Service-Key': this.apiKey,
        'X-Service-Id': this.serviceId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: `mail.${domain}`,
        isPrimary: true
      }),
    });

    return await response.json();
  }
}

// Usage in your main backend
const emailService = new EmailNotificationService(
  'http://notification_app:8001/api',
  'your_api_key_here',
  'your_service_id_here',
  'org_test_123'
);

// Send welcome email
app.post('/api/users/register', async (req, res) => {
  const { email, name } = req.body;
  
  // Create user logic here...
  
  // Send welcome email
  try {
    await emailService.sendEmail({
      to: email,
      from: 'noreply@mail.yourdomain.com',
      subject: 'Welcome to Our Platform',
      html: `<h1>Hi ${name}!</h1><p>Welcome to our platform.</p>`,
      text: `Hi ${name}! Welcome to our platform.`
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Email sending failed:', error);
    res.json({ success: true, emailError: error.message });
  }
});
```

### Python/Django Integration

```python
# email_service.py
import requests
import json
from typing import Dict, Any

class EmailNotificationService:
    def __init__(self, base_url: str, api_key: str, service_id: str, organization_id: str):
        self.base_url = base_url
        self.api_key = api_key
        self.service_id = service_id
        self.organization_id = organization_id
        self.headers = {
            'X-Service-Key': api_key,
            'X-Service-Id': service_id,
            'Content-Type': 'application/json'
        }
    
    def send_email(self, email_data: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.base_url}/internal/v1/organizations/{self.organization_id}/emails/send"
        
        response = requests.post(url, headers=self.headers, json=email_data)
        response.raise_for_status()
        
        return response.json()
    
    def get_domains(self) -> Dict[str, Any]:
        url = f"{self.base_url}/internal/v1/organizations/{self.organization_id}/domains"
        
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        
        return response.json()

# settings.py
EMAIL_SERVICE_URL = 'http://notification_app:8001/api'
EMAIL_SERVICE_API_KEY = 'your_api_key_here'
EMAIL_SERVICE_SERVICE_ID = 'your_service_id_here'
EMAIL_SERVICE_ORG_ID = 'org_test_123'

# views.py
from .email_service import EmailNotificationService

email_service = EmailNotificationService(
    settings.EMAIL_SERVICE_URL,
    settings.EMAIL_SERVICE_API_KEY,
    settings.EMAIL_SERVICE_SERVICE_ID,
    settings.EMAIL_SERVICE_ORG_ID
)

def register_user(request):
    email = request.POST.get('email')
    name = request.POST.get('name')
    
    # Create user logic here...
    
    # Send welcome email
    try:
        email_service.send_email({
            'to': email,
            'from': 'noreply@mail.yourdomain.com',
            'subject': 'Welcome to Our Platform',
            'html': f'<h1>Hi {name}!</h1><p>Welcome to our platform.</p>',
            'text': f'Hi {name}! Welcome to our platform.'
        })
    except Exception as e:
        print(f'Email sending failed: {e}')
    
    return JsonResponse({'success': True})
```

### PHP/Laravel Integration

```php
<?php
// EmailNotificationService.php

class EmailNotificationService 
{
    private $baseUrl;
    private $apiKey;
    private $serviceId;
    private $organizationId;
    
    public function __construct($baseUrl, $apiKey, $serviceId, $organizationId) 
    {
        $this->baseUrl = $baseUrl;
        $this->apiKey = $apiKey;
        $this->serviceId = $serviceId;
        $this->organizationId = $organizationId;
    }
    
    public function sendEmail($emailData) 
    {
        $url = $this->baseUrl . '/internal/v1/organizations/' . $this->organizationId . '/emails/send';
        
        $headers = [
            'X-Service-Key: ' . $this->apiKey,
            'X-Service-Id: ' . $this->serviceId,
            'Content-Type: application/json'
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($emailData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new Exception("Email service error: " . $httpCode);
        }
        
        return json_decode($response, true);
    }
}

// Usage in Controller
class UserController extends Controller 
{
    private $emailService;
    
    public function __construct() 
    {
        $this->emailService = new EmailNotificationService(
            env('EMAIL_SERVICE_URL'),
            env('EMAIL_SERVICE_API_KEY'),
            env('EMAIL_SERVICE_SERVICE_ID'),
            env('EMAIL_SERVICE_ORG_ID')
        );
    }
    
    public function register(Request $request) 
    {
        $email = $request->input('email');
        $name = $request->input('name');
        
        // Create user logic here...
        
        // Send welcome email
        try {
            $this->emailService->sendEmail([
                'to' => $email,
                'from' => 'noreply@mail.yourdomain.com',
                'subject' => 'Welcome to Our Platform',
                'html' => "<h1>Hi {$name}!</h1><p>Welcome to our platform.</p>",
                'text' => "Hi {$name}! Welcome to our platform."
            ]);
        } catch (Exception $e) {
            Log::error('Email sending failed: ' . $e->getMessage());
        }
        
        return response()->json(['success' => true]);
    }
}
```

## 4. Environment Configuration

### Docker Compose Integration

```yaml
# docker-compose.yml
version: '3.8'

services:
  main-backend:
    build: .
    environment:
      - EMAIL_SERVICE_URL=http://notification_app:8001/api
      - EMAIL_SERVICE_API_KEY=your_api_key_here
      - EMAIL_SERVICE_SERVICE_ID=your_service_id_here
      - EMAIL_SERVICE_ORG_ID=org_test_123
    depends_on:
      - notification_app
    networks:
      - app-network

  notification_app:
    image: your-notification-app:latest
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/notification_db
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### Environment Variables

```bash
# Main Backend .env
EMAIL_SERVICE_URL=http://notification_app:8001/api
EMAIL_SERVICE_API_KEY=your_generated_api_key
EMAIL_SERVICE_SERVICE_ID=your_generated_service_id
EMAIL_SERVICE_ORG_ID=org_test_123

# Notification Service .env
DATABASE_URL=postgresql://user:pass@localhost:5433/notification_db
REDIS_URL=redis://:password@localhost:6380
```

## 5. Advanced Integration Patterns

### Email Templates

```bash
# Create template
POST /internal/v1/organizations/{orgId}/templates
{
  "name": "welcome-email",
  "subject": "Welcome {{name}}!",
  "html": "<h1>Hi {{name}}!</h1><p>Welcome to {{company}}.</p>",
  "text": "Hi {{name}}! Welcome to {{company}}."
}

# Send with template
POST /internal/v1/organizations/{orgId}/emails/send
{
  "to": "user@example.com",
  "templateId": "template_uuid",
  "templateData": {
    "name": "John Doe",
    "company": "Your Company"
  }
}
```

### Bulk Email Sending

```bash
POST /internal/v1/organizations/{orgId}/emails/bulk
{
  "emails": [
    {
      "to": "user1@example.com",
      "subject": "Hello User 1",
      "html": "<p>Hello!</p>"
    },
    {
      "to": "user2@example.com", 
      "subject": "Hello User 2",
      "html": "<p>Hello!</p>"
    }
  ]
}
```

### Webhook Integration

Set up webhooks to receive email delivery status:

```javascript
// In your main backend
app.post('/webhooks/email-status', (req, res) => {
  const { emailJobId, status, event, timestamp } = req.body;
  
  console.log(`Email ${emailJobId} status: ${status}`);
  
  // Update your database with delivery status
  // status can be: QUEUED, SENT, DELIVERED, BOUNCED, FAILED
  
  res.status(200).send('OK');
});
```

## 6. Domain Management

### Multiple Domains per Organization

```bash
# Add multiple domains
POST /internal/v1/organizations/{orgId}/domains
{ "domain": "mail.client1.com", "isPrimary": false }

POST /internal/v1/organizations/{orgId}/domains  
{ "domain": "mail.client2.com", "isPrimary": true }  # This becomes active

# Switch active domain
PATCH /internal/v1/organizations/{orgId}/domains/{domainId}
{ "isPrimary": true }  # Makes this domain active, deactivates others
```

### Domain Selection in Backend

```javascript
class MultiDomainEmailService {
  async getActiveDomain(orgId) {
    const domains = await this.getDomains();
    return domains.data.find(d => d.isPrimary && d.isVerified);
  }
  
  async sendFromActiveDomain(emailData) {
    const activeDomain = await this.getActiveDomain();
    
    return await this.sendEmail({
      ...emailData,
      from: `noreply@${activeDomain.domain}`
    });
  }
  
  async switchActiveDomain(domainId) {
    await fetch(`${this.baseUrl}/internal/v1/organizations/${this.organizationId}/domains/${domainId}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify({ isPrimary: true })
    });
  }
}
```

## 7. Error Handling

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (invalid data)  
- `401` - Unauthorized (invalid API key)
- `404` - Resource not found
- `422` - Validation error
- `429` - Rate limit exceeded
- `500` - Internal server error

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email address",
    "details": {
      "field": "to",
      "value": "invalid-email"
    }
  },
  "meta": {
    "timestamp": "2025-08-24T07:30:00.000Z"
  }
}
```

### Retry Logic

```javascript
async function sendEmailWithRetry(emailData, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await emailService.sendEmail(emailData);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## 8. Monitoring & Logging

### Health Check

```bash
GET /health
```

### Email Status Tracking

```bash
GET /internal/v1/organizations/{orgId}/emails/{jobId}/status
```

Response:
```json
{
  "id": "job_uuid",
  "status": "SENT", 
  "attempts": 1,
  "sentAt": "2025-08-24T07:30:00.000Z",
  "messageId": "ses_message_id"
}
```

This guide provides everything your main backend needs to integrate with the email notification service!
