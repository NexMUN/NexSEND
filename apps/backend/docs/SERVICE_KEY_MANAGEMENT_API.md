# Service Key Management API

This document provides comprehensive details for integrating and managing service keys through the REST API.

## 📋 Overview

The Service Key Management API allows you to programmatically create, update, delete, and manage service keys without using CLI scripts. Service keys are global entities (not organization-specific) that provide authentication and authorization for the notification backend API.

## 🔧 Key Features

- ✅ **Unlimited Rate Limiting** - Default `-1` for infinite requests
- ✅ **Infinite Validity** - No expiration dates by default
- ✅ **Admin-level Authorization** - Permission-based access control
- ✅ **Secure API Key Handling** - Raw keys shown only once
- ✅ **Flexible Permissions** - JSON-based permission system
- ✅ **Usage Analytics** - Track email jobs and statistics
- ✅ **Soft/Hard Deletion** - Choose deletion strategy
- ✅ **Auto-generated IDs** - Automatic `svc_xxxxx` service ID generation

## 🔐 Authentication Requirements

All service key management endpoints require:

```bash
X-Service-Key: your_api_key_here
X-Service-Id: your_service_id_here
```

**Important**: Only service keys with `service-keys:*` or `service-keys:manage` permissions can manage other service keys.

## 📚 API Endpoints

### Base URL
```
http://localhost:8001/api/internal/v1/service-keys
# or
http://your-notification-backend:8001/api/internal/v1/service-keys
```

---

### 1. Create Service Key

**Endpoint:** `POST /api/internal/v1/service-keys`

**Description:** Create a new service key with specified permissions and settings.

**Headers:**
```bash
X-Service-Key: admin_api_key
X-Service-Id: admin_service_id
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Production Backend API Key",
  "permissions": {
    "organizations": ["*"],
    "domains": ["*"],
    "emails": ["*"],
    "service-keys": ["read"]
  },
  "webhookUrl": "https://api.example.com/webhooks/notifications",
  "rateLimitPerHour": -1,
  "rateLimitPerDay": -1
}
```

**Request Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Human-readable service key name |
| `permissions` | object | ✅ | Permission matrix (see [Permissions](#permissions)) |
| `webhookUrl` | string | ❌ | Webhook URL for notifications |
| `rateLimitPerHour` | number | ❌ | Hourly rate limit (-1 for unlimited) |
| `rateLimitPerDay` | number | ❌ | Daily rate limit (-1 for unlimited) |

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "serviceId": "svc_1234567890abcdef",
    "apiKey": "a1b2c3d4e5f6...64characters",
    "name": "Production Backend API Key",
    "permissions": {
      "organizations": ["*"],
      "domains": ["*"],
      "emails": ["*"],
      "service-keys": ["read"]
    },
    "webhookUrl": "https://api.example.com/webhooks/notifications",
    "isActive": true,
    "rateLimitPerHour": -1,
    "rateLimitPerDay": -1,
    "lastUsedAt": null,
    "expiresAt": null,
    "createdAt": "2025-08-28T05:50:19.000Z",
    "updatedAt": "2025-08-28T05:50:19.000Z"
  }
}
```

**⚠️ Important:** The `apiKey` field is only returned during creation. Save it securely - it cannot be retrieved later!

**Example cURL:**
```bash
curl -X POST http://localhost:8001/api/internal/v1/service-keys \
  -H "X-Service-Key: 579f64722dc7e6f5fd7369f85bebee97ddf94b67876ba54ed9be503964eba901" \
  -H "X-Service-Id: svc_b02a4aeecf6b51e3d497cb8979aece48" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Backend API Key",
    "permissions": {
      "organizations": ["*"],
      "domains": ["*"],
      "emails": ["*"]
    },
    "rateLimitPerHour": -1,
    "rateLimitPerDay": -1
  }'
```

---

### 2. List Service Keys

**Endpoint:** `GET /api/internal/v1/service-keys`

**Description:** Retrieve all service keys with pagination and filtering options.

**Headers:**
```bash
X-Service-Key: admin_api_key
X-Service-Id: admin_service_id
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | ❌ | Page number (default: 1) |
| `limit` | number | ❌ | Items per page (default: 20) |
| `isActive` | boolean | ❌ | Filter by active status |
| `search` | string | ❌ | Search by name or service ID |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "serviceKeys": [
      {
        "id": "uuid-1",
        "serviceId": "svc_1234567890abcdef",
        "name": "Production Backend API Key",
        "permissions": {
          "organizations": ["*"],
          "domains": ["*"],
          "emails": ["*"]
        },
        "webhookUrl": null,
        "isActive": true,
        "rateLimitPerHour": -1,
        "rateLimitPerDay": -1,
        "lastUsedAt": "2025-08-28T05:50:19.000Z",
        "expiresAt": null,
        "createdAt": "2025-08-28T05:50:19.000Z",
        "updatedAt": "2025-08-28T05:50:19.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1,
      "hasNext": false,
      "hasPrevious": false
    }
  }
}
```

**Example cURL:**
```bash
curl -H "X-Service-Key: your_api_key" \
     -H "X-Service-Id: your_service_id" \
     "http://localhost:8001/api/internal/v1/service-keys?page=1&limit=10&isActive=true"
```

---

### 3. Get Service Key Details

**Endpoint:** `GET /api/internal/v1/service-keys/{serviceId}`

**Description:** Retrieve detailed information about a specific service key.

**Headers:**
```bash
X-Service-Key: admin_api_key_or_own_key
X-Service-Id: admin_service_id_or_own_id
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "serviceId": "svc_1234567890abcdef",
    "name": "Production Backend API Key",
    "permissions": {
      "organizations": ["*"],
      "domains": ["*"],
      "emails": ["*"]
    },
    "webhookUrl": null,
    "isActive": true,
    "rateLimitPerHour": -1,
    "rateLimitPerDay": -1,
    "lastUsedAt": "2025-08-28T05:50:19.000Z",
    "expiresAt": null,
    "createdAt": "2025-08-28T05:50:19.000Z",
    "updatedAt": "2025-08-28T05:50:19.000Z"
  }
}
```

**Example cURL:**
```bash
curl -H "X-Service-Key: your_api_key" \
     -H "X-Service-Id: your_service_id" \
     http://localhost:8001/api/internal/v1/service-keys/svc_1234567890abcdef
```

---

### 4. Update Service Key

**Endpoint:** `PATCH /api/internal/v1/service-keys/{serviceId}`

**Description:** Update properties of an existing service key.

**Headers:**
```bash
X-Service-Key: admin_api_key
X-Service-Id: admin_service_id
Content-Type: application/json
```

**Request Body (all fields optional):**
```json
{
  "name": "Updated Service Key Name",
  "permissions": {
    "organizations": ["read", "write"],
    "domains": ["manage"],
    "emails": ["send"]
  },
  "webhookUrl": "https://new-webhook.example.com/notifications",
  "rateLimitPerHour": -1,
  "rateLimitPerDay": -1,
  "isActive": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "serviceId": "svc_1234567890abcdef",
    "name": "Updated Service Key Name",
    "permissions": {
      "organizations": ["read", "write"],
      "domains": ["manage"],
      "emails": ["send"]
    },
    "webhookUrl": "https://new-webhook.example.com/notifications",
    "isActive": true,
    "rateLimitPerHour": -1,
    "rateLimitPerDay": -1,
    "lastUsedAt": "2025-08-28T05:50:19.000Z",
    "expiresAt": null,
    "createdAt": "2025-08-28T05:50:19.000Z",
    "updatedAt": "2025-08-28T06:15:30.000Z"
  }
}
```

**Example cURL:**
```bash
curl -X PATCH http://localhost:8001/api/internal/v1/service-keys/svc_1234567890abcdef \
  -H "X-Service-Key: admin_api_key" \
  -H "X-Service-Id: admin_service_id" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Backend API Key",
    "isActive": false
  }'
```

---

### 5. Delete Service Key

**Endpoint:** `DELETE /api/internal/v1/service-keys/{serviceId}`

**Description:** Delete a service key (soft delete by default, hard delete optional).

**Headers:**
```bash
X-Service-Key: admin_api_key
X-Service-Id: admin_service_id
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `hardDelete` | boolean | ❌ | Perform hard delete instead of soft delete |

**Response (204 No Content):** Empty response body

**Example cURL (Soft Delete):**
```bash
curl -X DELETE http://localhost:8001/api/internal/v1/service-keys/svc_1234567890abcdef \
  -H "X-Service-Key: admin_api_key" \
  -H "X-Service-Id: admin_service_id"
```

**Example cURL (Hard Delete):**
```bash
curl -X DELETE "http://localhost:8001/api/internal/v1/service-keys/svc_1234567890abcdef?hardDelete=true" \
  -H "X-Service-Key: admin_api_key" \
  -H "X-Service-Id: admin_service_id"
```

**⚠️ Important:** You cannot delete your own service key. This prevents accidental lockouts.

---

### 6. Regenerate API Key

**Endpoint:** `POST /api/internal/v1/service-keys/{serviceId}/regenerate`

**Description:** Generate a new API key for an existing service (invalidates the old key).

**Headers:**
```bash
X-Service-Key: admin_api_key_or_own_key
X-Service-Id: admin_service_id_or_own_id
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "serviceId": "svc_1234567890abcdef",
    "apiKey": "new_a1b2c3d4e5f6...64characters",
    "name": "Production Backend API Key",
    "permissions": {
      "organizations": ["*"],
      "domains": ["*"],
      "emails": ["*"]
    },
    "webhookUrl": null,
    "isActive": true,
    "rateLimitPerHour": -1,
    "rateLimitPerDay": -1,
    "lastUsedAt": "2025-08-28T05:50:19.000Z",
    "expiresAt": null,
    "createdAt": "2025-08-28T05:50:19.000Z",
    "updatedAt": "2025-08-28T06:30:45.000Z"
  }
}
```

**⚠️ Important:** The new `apiKey` is only shown once. Save it securely and update your applications immediately!

**Example cURL:**
```bash
curl -X POST http://localhost:8001/api/internal/v1/service-keys/svc_1234567890abcdef/regenerate \
  -H "X-Service-Key: current_api_key" \
  -H "X-Service-Id: svc_1234567890abcdef"
```

---

### 7. Get Usage Statistics

**Endpoint:** `GET /api/internal/v1/service-keys/{serviceId}/usage`

**Description:** Retrieve usage statistics and analytics for a service key.

**Headers:**
```bash
X-Service-Key: admin_api_key_or_own_key
X-Service-Id: admin_service_id_or_own_id
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "serviceId": "svc_1234567890abcdef",
    "totalEmailJobs": 1250,
    "jobsByStatus": {
      "SENT": 1100,
      "FAILED": 50,
      "QUEUED": 25,
      "PROCESSING": 15,
      "BOUNCED": 60
    },
    "lastUsedAt": "2025-08-28T05:50:19.000Z",
    "isActive": true
  }
}
```

**Example cURL:**
```bash
curl -H "X-Service-Key: your_api_key" \
     -H "X-Service-Id: your_service_id" \
     http://localhost:8001/api/internal/v1/service-keys/svc_1234567890abcdef/usage
```

---

## 🔑 Permissions

The permission system uses a JSON object with resource-action mapping:

### Valid Resources:
- `organizations` - Organization management
- `domains` - Domain management  
- `emails` - Email sending
- `service-keys` - Service key management

### Valid Actions:
- `*` - All actions (full access)
- `read` - Read/view operations
- `write` - Create/update operations
- `create` - Create new entities
- `update` - Update existing entities
- `delete` - Delete operations
- `send` - Send emails (for email resource)
- `manage` - Full management (for domains/service-keys)

### Permission Examples:

**Full Admin Access:**
```json
{
  "organizations": ["*"],
  "domains": ["*"],
  "emails": ["*"],
  "service-keys": ["*"]
}
```

**Read-Only Access:**
```json
{
  "organizations": ["read"],
  "domains": ["read"],
  "emails": ["read"],
  "service-keys": ["read"]
}
```

**Email Service Only:**
```json
{
  "organizations": ["read"],
  "domains": ["read"],
  "emails": ["send"]
}
```

**Domain Manager:**
```json
{
  "organizations": ["read"],
  "domains": ["manage"],
  "emails": ["read"]
}
```

---

## 🚀 Integration Examples

### Node.js/Express Integration

```javascript
// service-key-manager.js
class ServiceKeyManager {
  constructor(baseUrl, adminApiKey, adminServiceId) {
    this.baseUrl = baseUrl;
    this.adminApiKey = adminApiKey;
    this.adminServiceId = adminServiceId;
    this.headers = {
      'X-Service-Key': adminApiKey,
      'X-Service-Id': adminServiceId,
      'Content-Type': 'application/json',
    };
  }

  async createServiceKey(name, permissions, options = {}) {
    const response = await fetch(`${this.baseUrl}/internal/v1/service-keys`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        name,
        permissions,
        rateLimitPerHour: options.rateLimitPerHour ?? -1,
        rateLimitPerDay: options.rateLimitPerDay ?? -1,
        webhookUrl: options.webhookUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create service key: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  }

  async listServiceKeys(filters = {}) {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive);
    if (filters.search) params.append('search', filters.search);

    const response = await fetch(`${this.baseUrl}/internal/v1/service-keys?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to list service keys: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  }

  async updateServiceKey(serviceId, updates) {
    const response = await fetch(`${this.baseUrl}/internal/v1/service-keys/${serviceId}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`Failed to update service key: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  }

  async deleteServiceKey(serviceId, hardDelete = false) {
    const params = hardDelete ? '?hardDelete=true' : '';
    const response = await fetch(`${this.baseUrl}/internal/v1/service-keys/${serviceId}${params}`, {
      method: 'DELETE',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to delete service key: ${response.status}`);
    }
  }

  async regenerateApiKey(serviceId) {
    const response = await fetch(`${this.baseUrl}/internal/v1/service-keys/${serviceId}/regenerate`, {
      method: 'POST',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to regenerate API key: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  }

  async getUsageStats(serviceId) {
    const response = await fetch(`${this.baseUrl}/internal/v1/service-keys/${serviceId}/usage`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get usage stats: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  }
}

// Usage example
const serviceKeyManager = new ServiceKeyManager(
  'http://notification_app:8001/api',
  'admin_api_key_here',
  'admin_service_id_here'
);

// Create a new service key
const newServiceKey = await serviceKeyManager.createServiceKey(
  'Backend API Key',
  {
    organizations: ['*'],
    domains: ['*'],
    emails: ['*']
  },
  {
    webhookUrl: 'https://api.example.com/webhooks/notifications'
  }
);

console.log('New API Key:', newServiceKey.apiKey);
console.log('Service ID:', newServiceKey.serviceId);
```

### Python Integration

```python
# service_key_manager.py
import requests
import json
from typing import Dict, List, Optional, Any

class ServiceKeyManager:
    def __init__(self, base_url: str, admin_api_key: str, admin_service_id: str):
        self.base_url = base_url
        self.headers = {
            'X-Service-Key': admin_api_key,
            'X-Service-Id': admin_service_id,
            'Content-Type': 'application/json'
        }

    def create_service_key(self, name: str, permissions: Dict[str, List[str]], 
                          webhook_url: Optional[str] = None, 
                          rate_limit_hour: int = -1, 
                          rate_limit_day: int = -1) -> Dict[str, Any]:
        url = f"{self.base_url}/internal/v1/service-keys"
        data = {
            'name': name,
            'permissions': permissions,
            'rateLimitPerHour': rate_limit_hour,
            'rateLimitPerDay': rate_limit_day
        }
        if webhook_url:
            data['webhookUrl'] = webhook_url

        response = requests.post(url, headers=self.headers, json=data)
        response.raise_for_status()
        return response.json()['data']

    def list_service_keys(self, page: int = 1, limit: int = 20, 
                         is_active: Optional[bool] = None, 
                         search: Optional[str] = None) -> Dict[str, Any]:
        url = f"{self.base_url}/internal/v1/service-keys"
        params = {'page': page, 'limit': limit}
        if is_active is not None:
            params['isActive'] = is_active
        if search:
            params['search'] = search

        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()['data']

    def update_service_key(self, service_id: str, **updates) -> Dict[str, Any]:
        url = f"{self.base_url}/internal/v1/service-keys/{service_id}"
        response = requests.patch(url, headers=self.headers, json=updates)
        response.raise_for_status()
        return response.json()['data']

    def delete_service_key(self, service_id: str, hard_delete: bool = False) -> None:
        url = f"{self.base_url}/internal/v1/service-keys/{service_id}"
        if hard_delete:
            url += "?hardDelete=true"
        
        response = requests.delete(url, headers=self.headers)
        response.raise_for_status()

    def regenerate_api_key(self, service_id: str) -> Dict[str, Any]:
        url = f"{self.base_url}/internal/v1/service-keys/{service_id}/regenerate"
        response = requests.post(url, headers=self.headers)
        response.raise_for_status()
        return response.json()['data']

    def get_usage_stats(self, service_id: str) -> Dict[str, Any]:
        url = f"{self.base_url}/internal/v1/service-keys/{service_id}/usage"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()['data']

# Usage example
service_manager = ServiceKeyManager(
    'http://notification_app:8001/api',
    'admin_api_key_here',
    'admin_service_id_here'
)

# Create service key
new_key = service_manager.create_service_key(
    'Backend API Key',
    {
        'organizations': ['*'],
        'domains': ['*'],
        'emails': ['*']
    },
    webhook_url='https://api.example.com/webhooks/notifications'
)

print(f"New API Key: {new_key['apiKey']}")
print(f"Service ID: {new_key['serviceId']}")
```

### PHP Integration

```php
<?php
// ServiceKeyManager.php
class ServiceKeyManager 
{
    private $baseUrl;
    private $headers;
    
    public function __construct($baseUrl, $adminApiKey, $adminServiceId) 
    {
        $this->baseUrl = $baseUrl;
        $this->headers = [
            'X-Service-Key: ' . $adminApiKey,
            'X-Service-Id: ' . $adminServiceId,
            'Content-Type: application/json'
        ];
    }
    
    public function createServiceKey($name, $permissions, $options = []) 
    {
        $url = $this->baseUrl . '/internal/v1/service-keys';
        
        $data = [
            'name' => $name,
            'permissions' => $permissions,
            'rateLimitPerHour' => $options['rateLimitPerHour'] ?? -1,
            'rateLimitPerDay' => $options['rateLimitPerDay'] ?? -1
        ];
        
        if (isset($options['webhookUrl'])) {
            $data['webhookUrl'] = $options['webhookUrl'];
        }
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, $this->headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 201) {
            throw new Exception("Failed to create service key: " . $httpCode);
        }
        
        $result = json_decode($response, true);
        return $result['data'];
    }
    
    public function listServiceKeys($filters = []) 
    {
        $url = $this->baseUrl . '/internal/v1/service-keys';
        
        if (!empty($filters)) {
            $url .= '?' . http_build_query($filters);
        }
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $this->headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new Exception("Failed to list service keys: " . $httpCode);
        }
        
        $result = json_decode($response, true);
        return $result['data'];
    }
}

// Usage example
$serviceManager = new ServiceKeyManager(
    'http://notification_app:8001/api',
    'admin_api_key_here',
    'admin_service_id_here'
);

// Create service key
$newKey = $serviceManager->createServiceKey(
    'Backend API Key',
    [
        'organizations' => ['*'],
        'domains' => ['*'],
        'emails' => ['*']
    ],
    [
        'webhookUrl' => 'https://api.example.com/webhooks/notifications'
    ]
);

echo "New API Key: " . $newKey['apiKey'] . "\n";
echo "Service ID: " . $newKey['serviceId'] . "\n";
?>
```

---

## ⚠️ Important Considerations

### Security Best Practices

1. **Store Admin Keys Securely**: Admin service keys should be stored in environment variables or secure vaults
2. **Use HTTPS**: Always use HTTPS in production environments
3. **Rotate Keys Regularly**: Use the regenerate endpoint to rotate API keys periodically
4. **Monitor Usage**: Use the usage statistics endpoint to monitor API key activity
5. **Principle of Least Privilege**: Grant only the minimum permissions required

### API Key Management

1. **Save Keys Immediately**: API keys are only shown once during creation/regeneration
2. **Update Applications**: After regenerating keys, update all applications immediately
3. **Test Before Deployment**: Test new keys in development before using in production
4. **Backup Strategy**: Keep track of active service keys and their purposes

### Rate Limiting

- Default unlimited rates (`-1`) can be changed per service key
- Monitor usage to prevent abuse
- Consider setting reasonable limits for external services

### Error Handling

All endpoints return standard HTTP status codes:
- `200` - Success
- `201` - Created
- `204` - No Content (for deletions)
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate service key)
- `500` - Internal Server Error

### Monitoring and Logging

All service key operations are logged with:
- Operation type (create, update, delete, etc.)
- Target service key ID
- Requesting service key ID
- Timestamp
- Result status

---

## 📖 Quick Start Guide

### Step 1: Create Admin Service Key

First, create an admin service key using the existing CLI script:

```bash
docker exec -it notification_app bun run service-key:create
# Enter: "Admin Service Key"
# Enter: "service-keys:*,organizations:*,domains:*,emails:*"
# Enter: (webhook URL or leave empty)
```

Save the returned API key and service ID.

### Step 2: Test API Access

```bash
curl -H "X-Service-Key: your_admin_api_key" \
     -H "X-Service-Id: your_admin_service_id" \
     http://localhost:8001/api/internal/v1/service-keys
```

### Step 3: Create Application Service Key

```bash
curl -X POST http://localhost:8001/api/internal/v1/service-keys \
  -H "X-Service-Key: your_admin_api_key" \
  -H "X-Service-Id: your_admin_service_id" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Application API Key",
    "permissions": {
      "organizations": ["*"],
      "domains": ["read"],
      "emails": ["send"]
    }
  }'
```

### Step 4: Use in Your Application

Use the returned API key and service ID in your application to access the notification backend.

---

## 🔄 Migration from CLI Scripts

If you're currently using CLI scripts (`create-service-key.ts`), you can migrate to the API:

### Before (CLI):
```bash
docker exec -it notification_app bun run service-key:create
```

### After (API):
```bash
curl -X POST http://localhost:8001/api/internal/v1/service-keys \
  -H "X-Service-Key: admin_key" \
  -H "X-Service-Id: admin_id" \
  -H "Content-Type: application/json" \
  -d '{"name": "Service Name", "permissions": {...}}'
```

The API provides the same functionality with better integration capabilities.

---

## 📞 Support

For issues or questions regarding the Service Key Management API:

1. Check the application logs: `docker logs notification_app`
2. Verify your admin service key has proper permissions
3. Ensure all required headers are included in requests
4. Check the API documentation at `http://localhost:8001/api/docs`

---

This completes the comprehensive Service Key Management API documentation. The system is ready for production integration with unlimited rate limiting and infinite validity as requested! 🚀