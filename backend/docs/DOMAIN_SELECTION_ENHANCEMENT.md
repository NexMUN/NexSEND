# Multi-Domain Selection Enhancement

## Current Behavior
- API key belongs to one organization
- System auto-detects organization from `from` email domain
- URL path: `/organizations/{orgId}/emails/send`

## Enhancement Options

### Option 1: Domain-Based Auto-Detection (Recommended)
```javascript
// Client just specifies the from address
const emailData = {
  to: "user@example.com",
  from: "support@mail.clienta.com",  // System detects org from domain
  subject: "Hello",
  html: "<p>Hello world</p>"
};

// System automatically:
// 1. Looks up which org owns "mail.clienta.com"
// 2. Validates API key has access to that org
// 3. Sends using that org's settings
```

### Option 2: Explicit Domain Selection
Add `domainId` field to email payload:

```javascript
const emailData = {
  domainId: "domain_123",  // Explicit domain selection
  to: "user@example.com",
  from: "support@mail.clienta.com", // Must match selected domain
  subject: "Hello",
  html: "<p>Hello world</p>"
};
```

### Option 3: Organization Selection
Add `organizationId` to payload:

```javascript
const emailData = {
  organizationId: "org_abc_123",  // Override URL org
  to: "user@example.com", 
  from: "support@mail.clienta.com",
  subject: "Hello",
  html: "<p>Hello world</p>"
};
```

### Option 4: Multi-Org API Keys
Allow API keys to access multiple organizations:

```javascript
// API key setup
const apiKey = await createMultiOrgApiKey({
  organizations: ["org_a", "org_b", "org_c"],
  permissions: ["email.send", "domain.read"]
});

// Frontend: Get available domains for this API key
const availableDomains = await fetch('/api/me/domains', {
  headers: { 'X-Service-Key': apiKey }
});

// Frontend: Domain selector component
const DomainSelector = ({ domains, onSelect }) => (
  <select onChange={(e) => onSelect(e.target.value)}>
    {domains.map(domain => (
      <option key={domain.id} value={domain.domain}>
        {domain.domain} ({domain.organizationName})
      </option>
    ))}
  </select>
);

// Send with selected domain
const sendEmail = async (selectedDomain) => {
  await fetch('/api/emails/send', {  // No org in URL
    method: 'POST',
    headers: { 'X-Service-Key': apiKey },
    body: JSON.stringify({
      from: `noreply@${selectedDomain}`,
      to: "user@example.com",
      subject: "Hello"
    })
  });
};
```

## Frontend Integration Examples

### Domain Selector Component
```javascript
import React, { useState, useEffect } from 'react';

const EmailComposer = ({ apiKey }) => {
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    html: ''
  });

  // Fetch available domains for this API key
  useEffect(() => {
    const fetchDomains = async () => {
      const response = await fetch('/api/me/domains', {
        headers: { 'X-Service-Key': apiKey }
      });
      const result = await response.json();
      setDomains(result.data);
      
      // Auto-select first verified domain
      const verified = result.data.find(d => d.isVerified);
      if (verified) setSelectedDomain(verified.domain);
    };
    
    fetchDomains();
  }, [apiKey]);

  const sendEmail = async () => {
    const response = await fetch('/api/emails/send', {
      method: 'POST',
      headers: {
        'X-Service-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...emailData,
        from: `noreply@${selectedDomain}`
      })
    });
    
    const result = await response.json();
    console.log('Email sent:', result);
  };

  return (
    <div className="email-composer">
      <h3>Send Email</h3>
      
      <div className="form-group">
        <label>From Domain:</label>
        <select 
          value={selectedDomain}
          onChange={(e) => setSelectedDomain(e.target.value)}
        >
          <option value="">Select domain...</option>
          {domains.map(domain => (
            <option key={domain.id} value={domain.domain}>
              {domain.domain} 
              {!domain.isVerified && ' (Unverified)'}
              ({domain.organizationName})
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>To:</label>
        <input 
          type="email"
          value={emailData.to}
          onChange={(e) => setEmailData({...emailData, to: e.target.value})}
        />
      </div>

      <div className="form-group">
        <label>Subject:</label>
        <input 
          type="text"
          value={emailData.subject}
          onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
        />
      </div>

      <div className="form-group">
        <label>Content:</label>
        <textarea 
          value={emailData.html}
          onChange={(e) => setEmailData({...emailData, html: e.target.value})}
          rows="10"
        />
      </div>

      <button 
        onClick={sendEmail} 
        disabled={!selectedDomain || !emailData.to}
      >
        Send Email
      </button>
    </div>
  );
};

export default EmailComposer;
```

### Multi-Org Dashboard
```javascript
const MultiOrgDashboard = ({ apiKey }) => {
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');

  useEffect(() => {
    const fetchOrganizations = async () => {
      const response = await fetch('/api/me/organizations', {
        headers: { 'X-Service-Key': apiKey }
      });
      const result = await response.json();
      setOrganizations(result.data);
    };
    
    fetchOrganizations();
  }, [apiKey]);

  return (
    <div className="multi-org-dashboard">
      <h2>Your Organizations</h2>
      
      <div className="org-selector">
        <select 
          value={selectedOrg}
          onChange={(e) => setSelectedOrg(e.target.value)}
        >
          <option value="">All Organizations</option>
          {organizations.map(org => (
            <option key={org.id} value={org.id}>
              {org.name} ({org.domains.length} domains)
            </option>
          ))}
        </select>
      </div>

      <div className="org-details">
        {selectedOrg && (
          <OrganizationView 
            organizationId={selectedOrg}
            apiKey={apiKey}
          />
        )}
      </div>
    </div>
  );
};
```

## Implementation Recommendation

For maximum flexibility, I recommend **Option 1 (Domain-Based Auto-Detection)** with enhancements:

1. **Auto-detect from `from` address** (current behavior)
2. **Add `/api/me/domains` endpoint** to list available domains for an API key
3. **Add `/api/me/organizations` endpoint** for multi-org API keys
4. **Enhanced validation** to ensure API key has access to the domain
5. **Frontend domain selector** for better UX

This provides:
- ✅ Simple API (just specify `from` address)
- ✅ Multi-domain support 
- ✅ Easy frontend integration
- ✅ Backward compatibility
- ✅ Clear domain ownership validation