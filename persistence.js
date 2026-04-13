const mongodb = require('mongodb')
const { MongoClient, ObjectId } = mongodb
const fs = require('fs')
const path = require('path')

let client = undefined

const dns = require('dns')
dns.setServers(['8.8.8.8', '8.8.4.4'])

/**
 * Connects to MongoDB if not already connected.
 * @returns {Promise<void>}
 */
async function connectDatabase() {
    if (!client) {
        client = new MongoClient("mongodb+srv://60304948:12class34@cluster0.lwoovex.mongodb.net/")
        await client.connect()
    }
}

/**
 * Returns the application database.
 * @returns {import('mongodb').Db}
 */
function getDb() {
    return client.db('infs3201_winter2026')
}

/**
 * Loads all employees.
 * @returns {Promise<Array>}
 */
async function loadAllEmployees() {
    await connectDatabase()
    let db = getDb()
    return await db.collection('employees').find().toArray()
}

/**
 * Finds one employee by Mongo ObjectId.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function findEmployeeById(id) {
    await connectDatabase()
    let db = getDb()

    if (!ObjectId.isValid(id)) {
        return null
    }

    return await db.collection('employees').findOne({ _id: new ObjectId(id) })
}

/**
 * Adds an employee.
 * @param {Object} employee
 * @returns {Promise<void>}
 */
async function addEmployee(employee) {
    await connectDatabase()
    let db = getDb()
    await db.collection('employees').insertOne(employee)
}

/**
 * Updates employee data.
 * @param {string} id
 * @param {string} name
 * @param {string} phone
 * @param {string} photo
 * @returns {Promise<void>}
 */
async function updateEmployee(id, name, phone, photo) {
    await connectDatabase()
    let db = getDb()

    if (!ObjectId.isValid(id)) {
        return
    }

    let updateData = {
        name: name,
        phone: phone
    }

    if (photo !== undefined && photo !== null && photo.length > 0) {
        updateData.photo = photo
    }

    await db.collection('employees').updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
    )
}

/**
 * Finds shifts for a given employee ObjectId.
 * @param {string} employeeId
 * @returns {Promise<Array>}
 */
async function findShiftsByEmployee(employeeId) {
    await connectDatabase()
    let db = getDb()

    if (!ObjectId.isValid(employeeId)) {
        return []
    }

    let shifts = await db.collection('shifts').find({
        employees: new ObjectId(employeeId)
    }).toArray()

    let result = []
    for (let i = 0; i < shifts.length; i++) {
        result.push({
            date: shifts[i].date,
            startTime: shifts[i].startTime,
            endTime: shifts[i].endTime
        })
    }
    return result
}

/**
 * Finds user details by username.
 * @param {string} username
 * @returns {Promise<Object|null>}
 */
async function getUserDetails(username) {
    await connectDatabase()
    let db = getDb()
    return await db.collection('users').findOne({ username: username })
}

/**
 * Updates a user record.
 * @param {string} username
 * @param {Object} updateData
 * @returns {Promise<void>}
 */
async function updateUser(username, updateData) {
    await connectDatabase()
    let db = getDb()
    await db.collection('users').updateOne(
        { username: username },
        { $set: updateData }
    )
}

/**
 * Increments the failed login attempts for a user.
 * @param {string} username
 * @returns {Promise<number>} - Returns the new count of failed attempts
 */
async function incrementFailedAttempts(username) {
    await connectDatabase()
    let db = getDb()
    
    let result = await db.collection('users').findOneAndUpdate(
        { username: username },
        { $inc: { failedAttempts: 1 } },
        { returnDocument: 'after' }
    )
    
    if (result && result.failedAttempts !== undefined) {
        return result.failedAttempts
    }
    return 0
}

/**
 * Resets the failed login attempts for a user.
 * @param {string} username
 * @returns {Promise<void>}
 */
async function resetFailedAttempts(username) {
    await connectDatabase()
    let db = getDb()
    await db.collection('users').updateOne(
        { username: username },
        { $set: { failedAttempts: 0 } }
    )
}

/**
 * Locks a user account.
 * @param {string} username
 * @returns {Promise<void>}
 */
async function lockUserAccount(username) {
    await connectDatabase()
    let db = getDb()
    await db.collection('users').updateOne(
        { username: username },
        { $set: { isLocked: true } }
    )
}

/**
 * Starts a session.
 * @param {Object} sessionData
 * @returns {Promise<void>}
 */
async function startSession(sessionData) {
    await connectDatabase()
    let db = getDb()
    await db.collection('sessions').insertOne(sessionData)
}

/**
 * Gets one session by key if not expired.
 * @param {string} sessionKey
 * @returns {Promise<Object|null>}
 */
async function getSession(sessionKey) {
    await connectDatabase()
    let db = getDb()

    let session = await db.collection('sessions').findOne({ key: sessionKey })
    if (!session) {
        return null
    }

    if (new Date(session.expiry) < new Date()) {
        await db.collection('sessions').deleteOne({ key: sessionKey })
        return null
    }

    return session
}

/**
 * Extends session expiry.
 * @param {string} sessionKey
 * @param {Date} newExpiry
 * @returns {Promise<void>}
 */
async function updateSessionExpiry(sessionKey, newExpiry) {
    await connectDatabase()
    let db = getDb()
    await db.collection('sessions').updateOne(
        { key: sessionKey },
        { $set: { expiry: newExpiry } }
    )
}

/**
 * Deletes a session.
 * @param {string} sessionKey
 * @returns {Promise<void>}
 */
async function deleteSession(sessionKey) {
    await connectDatabase()
    let db = getDb()
    await db.collection('sessions').deleteOne({ key: sessionKey })
}

/**
 * Writes a security log entry.
 * @param {Object} logEntry
 * @returns {Promise<void>}
 */
async function logSecurityAccess(logEntry) {
    await connectDatabase()
    let db = getDb()
    await db.collection('security_log').insertOne(logEntry)
}

/**
 * Stores a pending 2FA code for a user.
 * @param {string} username
 * @param {string} code
 * @param {Date} expiry
 * @returns {Promise<void>}
 */
async function store2FACode(username, code, expiry) {
    await connectDatabase()
    let db = getDb()
    
    // Remove any existing 2FA codes for this user first
    await db.collection('twofa_codes').deleteMany({ username: username })
    
    await db.collection('twofa_codes').insertOne({
        username: username,
        code: code,
        expiry: expiry,
        createdAt: new Date()
    })
}

/**
 * Validates a 2FA code for a user.
 * @param {string} username
 * @param {string} code
 * @returns {Promise<boolean>}
 */
async function validate2FACode(username, code) {
    await connectDatabase()
    let db = getDb()
    
    let record = await db.collection('twofa_codes').findOne({
        username: username,
        code: code
    })
    
    if (!record) {
        return false
    }
    
    // Check if code has expired
    if (new Date(record.expiry) < new Date()) {
        await db.collection('twofa_codes').deleteOne({ _id: record._id })
        return false
    }
    
    // Code is valid, delete it after use
    await db.collection('twofa_codes').deleteOne({ _id: record._id })
    return true
}

/**
 * Deletes 2FA codes for a user.
 * @param {string} username
 * @returns {Promise<void>}
 */
async function delete2FACodes(username) {
    await connectDatabase()
    let db = getDb()
    await db.collection('twofa_codes').deleteMany({ username: username })
}

/**
 * Stores a pending 2FA session (before 2FA is completed).
 * @param {string} tempKey
 * @param {string} username
 * @param {Date} expiry
 * @returns {Promise<void>}
 */
async function storePending2FASession(tempKey, username, expiry) {
    await connectDatabase()
    let db = getDb()
    await db.collection('pending_2fa').insertOne({
        tempKey: tempKey,
        username: username,
        expiry: expiry
    })
}

/**
 * Gets a pending 2FA session.
 * @param {string} tempKey
 * @returns {Promise<Object|null>}
 */
async function getPending2FASession(tempKey) {
    await connectDatabase()
    let db = getDb()
    
    let session = await db.collection('pending_2fa').findOne({ tempKey: tempKey })
    if (!session) {
        return null
    }
    
    if (new Date(session.expiry) < new Date()) {
        await db.collection('pending_2fa').deleteOne({ tempKey: tempKey })
        return null
    }
    
    return session
}

/**
 * Deletes a pending 2FA session.
 * @param {string} tempKey
 * @returns {Promise<void>}
 */
async function deletePending2FASession(tempKey) {
    await connectDatabase()
    let db = getDb()
    await db.collection('pending_2fa').deleteOne({ tempKey: tempKey })
}

// ============================================
// Employee Document Functions
// ============================================

/**
 * Gets the documents directory path for an employee.
 * @param {string} employeeId
 * @returns {string}
 */
function getEmployeeDocumentsPath(employeeId) {
    return path.join(__dirname, 'uploads', 'documents', employeeId)
}

/**
 * Ensures the documents directory exists for an employee.
 * @param {string} employeeId
 * @returns {void}
 */
function ensureEmployeeDocumentsDir(employeeId) {
    let dirPath = getEmployeeDocumentsPath(employeeId)
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
    }
}

/**
 * Gets the list of documents for an employee.
 * @param {string} employeeId
 * @returns {Promise<Array>}
 */
async function getEmployeeDocuments(employeeId) {
    await connectDatabase()
    let db = getDb()
    
    let docs = await db.collection('employee_documents').find({
        employeeId: employeeId
    }).toArray()
    
    return docs
}

/**
 * Counts the number of documents for an employee.
 * @param {string} employeeId
 * @returns {Promise<number>}
 */
async function countEmployeeDocuments(employeeId) {
    await connectDatabase()
    let db = getDb()
    
    return await db.collection('employee_documents').countDocuments({
        employeeId: employeeId
    })
}

/**
 * Saves a document record for an employee.
 * @param {string} employeeId
 * @param {string} originalName
 * @param {string} storedName
 * @param {number} fileSize
 * @returns {Promise<Object>}
 */
async function saveEmployeeDocument(employeeId, originalName, storedName, fileSize) {
    await connectDatabase()
    let db = getDb()
    
    let doc = {
        employeeId: employeeId,
        originalName: originalName,
        storedName: storedName,
        fileSize: fileSize,
        uploadedAt: new Date()
    }
    
    let result = await db.collection('employee_documents').insertOne(doc)
    doc._id = result.insertedId
    return doc
}

/**
 * Gets a document by ID.
 * @param {string} documentId
 * @returns {Promise<Object|null>}
 */
async function getDocumentById(documentId) {
    await connectDatabase()
    let db = getDb()
    
    if (!ObjectId.isValid(documentId)) {
        return null
    }
    
    return await db.collection('employee_documents').findOne({
        _id: new ObjectId(documentId)
    })
}

/**
 * Deletes a document record.
 * @param {string} documentId
 * @returns {Promise<boolean>}
 */
async function deleteEmployeeDocument(documentId) {
    await connectDatabase()
    let db = getDb()
    
    if (!ObjectId.isValid(documentId)) {
        return false
    }
    
    let result = await db.collection('employee_documents').deleteOne({
        _id: new ObjectId(documentId)
    })
    
    return result.deletedCount > 0
}

/**
 * Loads config from config.json.
 * @returns {Promise<Object>}
 */
async function loadConfig() {
    let fsPromises = require('fs/promises')
    let raw = await fsPromises.readFile('config.json', 'utf-8')
    return JSON.parse(raw)
}

module.exports = {
    loadAllEmployees,
    loadConfig,
    findEmployeeById,
    addEmployee,
    updateEmployee,
    findShiftsByEmployee,
    getUserDetails,
    updateUser,
    incrementFailedAttempts,
    resetFailedAttempts,
    lockUserAccount,
    startSession,
    getSession,
    updateSessionExpiry,
    deleteSession,
    logSecurityAccess,
    store2FACode,
    validate2FACode,
    delete2FACodes,
    storePending2FASession,
    getPending2FASession,
    deletePending2FASession,
    getEmployeeDocumentsPath,
    ensureEmployeeDocumentsDir,
    getEmployeeDocuments,
    countEmployeeDocuments,
    saveEmployeeDocument,
    getDocumentById,
    deleteEmployeeDocument
}
