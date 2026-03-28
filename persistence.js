const mongodb = require('mongodb')
const { MongoClient, ObjectId } = mongodb

let client = undefined

const dns = require('dns')
dns.setServers(['8.8.8.8', '8.8.4.4'])

/**
 * Connects to MongoDB if not already connected.
 * @returns {Promise<void>}
 */
async function connectDatabase() {
    if (!client) {
        client = new MongoClient("mongodb+srv://Rawand_60304948:12class34@cluster0.0ztz6je.mongodb.net/")
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
 * Loads config from config.json.
 * @returns {Promise<Object>}
 */
async function loadConfig() {
    let fs = require('fs/promises')
    let raw = await fs.readFile('config.json', 'utf-8')
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
    startSession,
    getSession,
    updateSessionExpiry,
    deleteSession,
    logSecurityAccess
}