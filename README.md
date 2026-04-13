## Login Credentials

| Username | Password |
|----------|----------|
| `admin` | `admin123` |
| `rawand` | `password123` |
| `manager` | `manager123` |

---

## Features Implemented

### 1. Two-Factor Authentication (2FA)
- After correct login, a 6-digit code is sent via email (shown in console)
- Code expires after **3 minutes**
- Session only starts after 2FA verification

### 2. Account Security
- **3 failed attempts** → Suspicious activity email notification
- **10 failed attempts** → Account is locked
- Locked accounts can only be unlocked via database

### 3. Employee Document Upload
- **PDF only**
- **Maximum 2MB** file size
- **Maximum 5 documents** per employee
- Documents protected behind authentication
- Files stored in file system, not database

---

## Project Structure

```
Assignment5_Rawand_60304948/
├── server.js           # Express server with routes
├── business.js         # Business logic layer
├── persistence.js      # Database operations
├── emailSystem.js      # Email system (console.log output)
├── package.json        # Dependencies
├── public/             # Static files
│   ├── styles.css
│   └── images/
├── uploads/            # Document storage (protected)
│   └── documents/
└── views/              # Handlebars templates
    ├── login.handlebars
    ├── verify2fa.handlebars
    ├── landing.handlebars
    ├── employeeDetails.handlebars
    └── editEmployee.handlebars
```

---

## Testing the Features

### Test 2FA:
1. Login with valid credentials
2. Check console for 6-digit code
3. Enter code on 2FA page

### Test Account Security:
1. Enter wrong password 3 times → check console for warning email
2. Enter wrong password 10 times → account locks

### Test Document Upload:
1. Go to an employee's page
2. Upload a PDF (under 2MB)
3. Try uploading non-PDF → should fail
4. Try uploading file over 2MB → should fail
5. Upload 5 files, try 6th → should fail

---
