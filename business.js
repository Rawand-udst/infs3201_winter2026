const persistence = require("./persistence")
const crypto = require('crypto')

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
 * Attempts login and creates session data if valid.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<Object|undefined>}
 */
async function attemptLogin(username, password) {
    if (!username || !password) {
        return undefined
    }

    username = username.trim()
    password = password.trim()

    let details = await persistence.getUserDetails(username)
    if (!details) {
        return undefined
    }

    let hashed = hashPassword(password)

    if (details.password !== hashed) {
        return undefined
    }

    let sessionKey = crypto.randomUUID()
    let sd = {
        key: sessionKey,
        expiry: new Date(Date.now() + 1000 * 60 * 5),
        data: { username: details.username }
    }

    await persistence.startSession(sd)
    return sd
}

module.exports = {
    allEmployees,
    employeeDetails,
    updateEmployee,
    getEmployeeSchedule,
    isMorningTime,
    attemptLogin
}