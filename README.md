# INFS3201 - Assignment 5
## Employee Scheduling System with 2FA and Document Upload

**Student:** Rawand  
**Student ID:** 60304948  
**Course:** INFS3201 - Web Technologies II  
**Due Date:** April 14, 2026 @ 11:59pm

---

## Overview

This assignment extends the Assignment 4 scheduling system with the following features:

1. **Two-Factor Authentication (2FA) via Email**
   - 6-digit verification code sent to user's email
   - Code expires after 3 minutes
   - Session only starts after successful 2FA verification

2. **Enhanced Security Features**
   - After 3 failed login attempts: Suspicious activity email notification
   - After 10 failed login attempts: Account is locked
   - Locked accounts can only be unlocked via database

3. **Employee Document Upload**
   - PDF documents only
   - Maximum file size: 2MB
   - Maximum 5 documents per employee
   - Documents protected behind authentication
   - Files stored in file system (not database)

---

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Access the application at: http://localhost:8000

---

## Project Structure

```
Assignment5_Rawand_60304948/
├── server.js           # Express server with routes
├── business.js         # Business logic layer
├── persistence.js      # Database operations
├── emailSystem.js      # Email system (console.log implementation)
├── package.json        # Dependencies
├── public/             # Static files
│   ├── styles.css
│   └── images/
├── uploads/            # Document storage (not public)
│   └── documents/
└── views/              # Handlebars templates
    ├── login.handlebars
    ├── verify2fa.handlebars
    ├── landing.handlebars
    ├── employeeDetails.handlebars
    └── editEmployee.handlebars
```

---

## Features Implemented

### 1. Email System (`emailSystem.js`)

The email system provides a clean interface for sending emails. The implementation uses `console.log()` to display email content, but the interface is designed to be easily swapped with a real email provider.

Functions:
- `send2FACode(toEmail, username, code)` - Sends 2FA verification code
- `sendSuspiciousActivityWarning(toEmail, username, failedAttempts)` - Warns about suspicious activity
- `sendAccountLockedNotification(toEmail, username)` - Notifies user their account is locked
- `sendEmail(toEmail, subject, body)` - Generic email sending

### 2. Two-Factor Authentication

**Login Flow:**
1. User enters username/password
2. If credentials valid, 6-digit code is generated and "sent" via email
3. User redirected to 2FA verification page
4. User enters the code from email
5. If code valid and not expired, session is created
6. User redirected to main application

**Security Features:**
- 2FA codes expire after 3 minutes
- Temporary session key used during 2FA process
- Session not created until 2FA is complete

### 3. Account Security

**Failed Login Tracking:**
- Failed attempts are incremented on wrong password
- Counter resets on successful password entry
- After 3 failures: Suspicious activity email sent
- After 10 failures: Account is locked

**Account Locking:**
- Locked accounts cannot log in
- Lock can only be removed via database:
  ```javascript
  db.users.updateOne({username: "user"}, {$set: {isLocked: false, failedAttempts: 0}})
  ```

### 4. Employee Documents

**Upload Validation:**
- File type: PDF only (checked by mimetype and extension)
- File size: Maximum 2MB
- Document count: Maximum 5 per employee

**File Storage:**
- Files stored in `uploads/documents/{employeeId}/`
- Original filename preserved in database
- Stored filename uses UUID for uniqueness
- Files NOT accessible via static routes

**Document Access:**
- Download requires authentication
- Files served through authenticated route `/documents/download/:documentId`
- Delete functionality available

---

## Database Collections

The following MongoDB collections are used:

- `users` - User accounts with fields: `username`, `password`, `email`, `failedAttempts`, `isLocked`
- `employees` - Employee information
- `shifts` - Shift schedules
- `sessions` - Active user sessions
- `security_log` - Security access logging
- `twofa_codes` - Temporary 2FA codes
- `pending_2fa` - Pending 2FA sessions
- `employee_documents` - Document metadata

---

## API Routes

### Authentication
- `GET /login` - Login page
- `POST /login` - Process login (initiates 2FA)
- `GET /verify-2fa` - 2FA code entry page
- `POST /verify-2fa` - Verify 2FA code
- `GET /logout` - Logout user

### Main Application
- `GET /` - Employee list
- `GET /employee/:employeeId` - Employee details with documents
- `GET /edit/:id` - Edit employee form
- `POST /edit/:id` - Update employee

### Documents
- `POST /employee/:employeeId/documents/upload` - Upload document
- `GET /documents/download/:documentId` - Download document
- `POST /documents/delete/:documentId` - Delete document

---

## Testing the Application

### Testing 2FA:
1. Login with valid credentials
2. Check console for the 6-digit code (email simulation)
3. Enter the code on the 2FA page
4. You should be logged in

### Testing Failed Login Security:
1. Attempt login with wrong password 3 times
2. Check console for suspicious activity email
3. Continue to 10 failed attempts
4. Check console for account locked email
5. Try logging in - should see "account locked" message

### Testing Document Upload:
1. Login and navigate to an employee
2. Try uploading a non-PDF file (should fail)
3. Try uploading a file larger than 2MB (should fail)
4. Upload a valid PDF (should succeed)
5. Upload 5 documents, try uploading a 6th (should fail)
6. Download a document (should work)
7. Delete a document (should work)
8. Logout and try accessing document URL directly (should redirect to login)

---

## Notes

- The email system outputs to console for testing purposes
- MongoDB connection string is included in persistence.js
- Files are stored in the file system, metadata in database
- All document routes are protected by authentication middleware

---

## GitHub Repository

[Add your GitHub repository link here]

---

## Commits

This project follows the commit requirements:
- Initial commit for Assignment 5 base
- 2FA implementation
- Account security features
- Document upload feature
- Final testing and cleanup
