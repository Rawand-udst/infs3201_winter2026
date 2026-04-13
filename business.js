const persistence = require("./persistence")
const emailSystem = require("./emailSystem")
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

/**
 * Returns all employees.
 * @returns {Promise<Array>}
 */
async function allEmployees() {
    return await persistence.loadAllEmployees()
}

/**
 * Checks if a value is blank.
 * @param {string} value
 * @returns {boolean}
 */
function isBlank(value) {
    return value === null || value === undefined || value.trim().length === 0
}

/**
 * Finds one employee by id.
 * @param {string} employeeId
 * @returns {Promise<Object|null>}
 */
async function employeeDetails(employeeId) {
    return await persistence.findEmployeeById(employeeId)
}

/**
 * Validates phone format 0000-0000.
 * @param {string} phone
 * @returns {boolean}
 */
function validPhoneFormat(phone) {
    if (phone.length !== 9) {
        return false
    }
    if (phone[4] !== '-') {
        return false
    }
    for (let i = 0; i < phone.length; i++) {
        if (i === 4) {
            continue
        }
        let c = phone.charCodeAt(i)
        if (c < 48 || c > 57) {
            return false
        }
    }
    return true
}

/**
 * Converts HH:MM to minutes.
 * @param {string} hhmm
 * @returns {number}
 */
function timeToMinutes(hhmm) {
    let hh = Number(hhmm.substring(0, 2))
    let mm = Number(hhmm.substring(3, 5))
    return hh * 60 + mm
}

/**
 * Compares shifts by date then start time.
 * @param {Object} a
 * @param {Object} b
 * @returns {number}
 */
function compareShift(a, b) {
    if (a.date < b.date) return -1
    if (a.date > b.date) return 1

    let am = timeToMinutes(a.startTime)
    let bm = timeToMinutes(b.startTime)

    if (am < bm) return -1
    if (am > bm) return 1
    return 0
}

/**
 * Bubble sorts shifts.
 * @param {Array} shifts
 * @returns {Array}
 */
function sortShifts(shifts) {
    let num = shifts.length
    for (let i = 0; i < num - 1; i++) {
        let swap = false
        for (let j = 0; j < num - i - 1; j++) {
            if (compareShift(shifts[j], shifts[j + 1]) > 0) {
                let temp = shifts[j]
                shifts[j] = shifts[j + 1]
                shifts[j + 1] = temp
                swap = true
            }
        }
        if (!swap) {
            break
        }
    }
    return shifts
}

/**
 * Gets schedule for one employee.
 * @param {string} employeeId
 * @returns {Promise<Array>}
 */
async function getEmployeeSchedule(employeeId) {
    let shifts = await persistence.findShiftsByEmployee(employeeId)
    return sortShifts(shifts)
}

/**
 * Checks whether time is morning.
 * @param {string} time
 * @returns {boolean}
 */
function isMorningTime(time) {
    let hours = Number(time.substring(0, 2))
    return hours < 12
}

/**
 * Updates employee after validation.
 * @param {string} employeeId
 * @param {string} name
 * @param {string} phone
 * @param {string} photo
 * @returns {Promise<string>}
 */
async function updateEmployee(employeeId, name, phone, photo) {
    if (isBlank(name)) {
        return 'Name cannot be empty'
    }
    name = name.trim()

    if (isBlank(phone)) {
        return 'Phone cannot be empty'
    }
    phone = phone.trim()

    if (!validPhoneFormat(phone)) {
        return 'Phone must be in the format 0000-0000'
    }

    await persistence.updateEmployee(employeeId, name, phone, photo)
    return ''
}

/**
 * Hashes a password with sha256.
 * @param {string} password
 * @returns {string}
 */
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex')
}

/**
 * Generates a random 6-digit code for 2FA.
 * @returns {string}
 */
function generate2FACode() {
    let code = ''
    for (let i = 0; i < 6; i++) {
        code += Math.floor(Math.random() * 10).toString()
    }
    return code
}

/**
 * Validates credentials and initiates 2FA process.
 * Returns result object with success status and any error messages.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<Object>}
 */
async function validateCredentials(username, password) {
    if (!username || !password) {
        return { success: false, error: 'Username and password are required' }
    }

    username = username.trim()
    password = password.trim()

    let details = await persistence.getUserDetails(username)
    if (!details) {
        return { success: false, error: 'Invalid username or password' }
    }

    // Check if account is locked
    if (details.isLocked === true) {
        return { success: false, error: 'Your account is locked. Please contact administrator.' }
    }

    let hashed = hashPassword(password)

    if (details.password !== hashed) {
        // Increment failed attempts
        let failedAttempts = await persistence.incrementFailedAttempts(username)
        
        // Get user email (for demo, we'll use username@example.com)
        let userEmail = details.email || username + '@example.com'
        
        // After 3 failed attempts, send suspicious activity warning
        if (failedAttempts === 3) {
            await emailSystem.sendSuspiciousActivityWarning(userEmail, username, failedAttempts)
        }
        
        // After 10 failed attempts, lock the account
        if (failedAttempts >= 10) {
            await persistence.lockUserAccount(username)
            await emailSystem.sendAccountLockedNotification(userEmail, username)
            return { success: false, error: 'Your account has been locked due to too many failed attempts.' }
        }
        
        return { success: false, error: 'Invalid username or password' }
    }

    // Password is correct, initiate 2FA
    // Reset failed attempts on successful password
    await persistence.resetFailedAttempts(username)
    
    // Generate and store 2FA code
    let code = generate2FACode()
    let codeExpiry = new Date(Date.now() + 1000 * 60 * 3) // 3 minutes
    await persistence.store2FACode(username, code, codeExpiry)
    
    // Generate a temporary key for the 2FA session
    let tempKey = crypto.randomUUID()
    let tempExpiry = new Date(Date.now() + 1000 * 60 * 3) // 3 minutes
    await persistence.storePending2FASession(tempKey, username, tempExpiry)
    
    // Send the 2FA code via email
    let userEmail = details.email || username + '@example.com'
    await emailSystem.send2FACode(userEmail, username, code)
    
    return { 
        success: true, 
        requires2FA: true, 
        tempKey: tempKey,
        username: username
    }
}

/**
 * Verifies the 2FA code and creates a session.
 * @param {string} tempKey
 * @param {string} code
 * @returns {Promise<Object|undefined>}
 */
async function verify2FACode(tempKey, code) {
    if (!tempKey || !code) {
        return undefined
    }
    
    code = code.trim()
    
    // Get the pending 2FA session
    let pending = await persistence.getPending2FASession(tempKey)
    if (!pending) {
        return undefined
    }
    
    let username = pending.username
    
    // Validate the code
    let isValid = await persistence.validate2FACode(username, code)
    if (!isValid) {
        return undefined
    }
    
    // Delete the pending session
    await persistence.deletePending2FASession(tempKey)
    
    // Create the actual session
    let sessionKey = crypto.randomUUID()
    let sd = {
        key: sessionKey,
        expiry: new Date(Date.now() + 1000 * 60 * 5),
        data: { username: username }
    }
    
    await persistence.startSession(sd)
    return sd
}

/**
 * Legacy login function - kept for backwards compatibility.
 * Now redirects to the 2FA flow.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<Object|undefined>}
 */
async function attemptLogin(username, password) {
    let result = await validateCredentials(username, password)
    if (!result.success) {
        return undefined
    }
    // Return the result which includes tempKey for 2FA
    return result
}

// ============================================
// Employee Document Functions
// ============================================

/**
 * Maximum file size for documents (2MB in bytes).
 * @type {number}
 */
const MAX_FILE_SIZE = 2 * 1024 * 1024

/**
 * Maximum number of documents per employee.
 * @type {number}
 */
const MAX_DOCUMENTS_PER_EMPLOYEE = 5

/**
 * Validates a document upload.
 * @param {string} employeeId
 * @param {Object} file - The uploaded file object
 * @returns {Promise<Object>} - Result with success and error if any
 */
async function validateDocumentUpload(employeeId, file) {
    // Check if file exists
    if (!file) {
        return { success: false, error: 'No file uploaded' }
    }
    
    // Check file type - must be PDF
    let mimetype = file.mimetype || ''
    let originalName = file.originalname || ''
    let extension = originalName.substring(originalName.lastIndexOf('.')).toLowerCase()
    
    if (mimetype !== 'application/pdf' && extension !== '.pdf') {
        return { success: false, error: 'Only PDF documents are allowed' }
    }
    
    // Check file size - must be <= 2MB
    if (file.size > MAX_FILE_SIZE) {
        return { success: false, error: 'File size must not exceed 2MB' }
    }
    
    // Check document count - max 5 per employee
    let docCount = await persistence.countEmployeeDocuments(employeeId)
    if (docCount >= MAX_DOCUMENTS_PER_EMPLOYEE) {
        return { success: false, error: 'Maximum of 5 documents per employee reached' }
    }
    
    return { success: true }
}

/**
 * Saves a document for an employee.
 * @param {string} employeeId
 * @param {Object} file - The uploaded file object
 * @returns {Promise<Object>} - Result with success and document or error
 */
async function saveEmployeeDocument(employeeId, file) {
    // Validate the upload first
    let validation = await validateDocumentUpload(employeeId, file)
    if (!validation.success) {
        return validation
    }
    
    // Ensure the employee documents directory exists
    persistence.ensureEmployeeDocumentsDir(employeeId)
    
    // Generate a unique filename
    let originalName = file.originalname
    let storedName = crypto.randomUUID() + '.pdf'
    
    // Get the path where we'll store the file
    let dirPath = persistence.getEmployeeDocumentsPath(employeeId)
    let filePath = path.join(dirPath, storedName)
    
    // Move/copy the file from temp location
    fs.writeFileSync(filePath, file.buffer)
    
    // Save the document record to database
    let doc = await persistence.saveEmployeeDocument(
        employeeId, 
        originalName, 
        storedName, 
        file.size
    )
    
    return { success: true, document: doc }
}

/**
 * Gets all documents for an employee.
 * @param {string} employeeId
 * @returns {Promise<Array>}
 */
async function getEmployeeDocuments(employeeId) {
    return await persistence.getEmployeeDocuments(employeeId)
}

/**
 * Gets a document file path for download.
 * @param {string} documentId
 * @returns {Promise<Object|null>}
 */
async function getDocumentForDownload(documentId) {
    let doc = await persistence.getDocumentById(documentId)
    if (!doc) {
        return null
    }
    
    let filePath = path.join(
        persistence.getEmployeeDocumentsPath(doc.employeeId),
        doc.storedName
    )
    
    if (!fs.existsSync(filePath)) {
        return null
    }
    
    return {
        document: doc,
        filePath: filePath
    }
}

/**
 * Deletes an employee document.
 * @param {string} documentId
 * @returns {Promise<boolean>}
 */
async function deleteDocument(documentId) {
    let doc = await persistence.getDocumentById(documentId)
    if (!doc) {
        return false
    }
    
    // Delete the file from disk
    let filePath = path.join(
        persistence.getEmployeeDocumentsPath(doc.employeeId),
        doc.storedName
    )
    
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
    }
    
    // Delete the database record
    return await persistence.deleteEmployeeDocument(documentId)
}

module.exports = {
    allEmployees,
    employeeDetails,
    updateEmployee,
    getEmployeeSchedule,
    isMorningTime,
    attemptLogin,
    validateCredentials,
    verify2FACode,
    validateDocumentUpload,
    saveEmployeeDocument,
    getEmployeeDocuments,
    getDocumentForDownload,
    deleteDocument
}
