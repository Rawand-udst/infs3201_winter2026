const fs = require('fs/promises')

/**
 * Return a list of all employees loaded from the storage.
 * @returns {Array<{ employeeId: string, name: string, phone: string }>} List of employees
 */
async function getAllEmployees() {
    let rawData = await fs.readFile('employees.json')
    result = JSON.parse(rawData)
    return result
}

/**
 * Find a single employee given their ID number.
 * @param {string} empId 
 * @returns {{ employeeId: string, name: string, phone: string }|undefined}
 */
async function findEmployee(empId) {
    let rawData = await fs.readFile('employees.json')
    employeeList = JSON.parse(rawData)
    for (let emp of employeeList) {
        if (emp.employeeId === empId) {
            return emp
        }
    }
    return undefined
}

/**
 * Get a single shift given the shiftId
 * @param {string} shiftId 
 * @returns {{shiftId:string, date:string, startTime:string, endTime:string}|undefined}
 */
async function findShift(shiftId) {
    let rawData = await fs.readFile('shifts.json')
    shiftList = JSON.parse(rawData)
    for (let shift of shiftList) {
        if (shift.shiftId == shiftId) {
            return shift
        }
    }
    return undefined
}

/**
 * Get a list of shiftIDs for an employee.
 * @param {string} empId 
 * @returns {Array<{string}>}
 */
async function getEmployeeShifts(empId) {
    let rawData = await fs.readFile('assignments.json')
    assignmentList = JSON.parse(rawData)
    let shiftIds = []
    for (let asn of assignmentList) {
        if (asn.employeeId == empId) {
            shiftIds.push(asn.shiftId)
        }
    }

    rawData = await fs.readFile('shifts.json')
    shiftList = JSON.parse(rawData)
    let shiftDetails = []
    for (let sh of shiftList) {
        if (shiftIds.includes(sh.shiftId)) {
            shiftDetails.push(sh)
        }
    }

    return shiftDetails
}

/**
 * Get a list of shiftIDs for an employee.
 * @param {string} empId 
 * @returns {Array<{string}>}
 */
async function getEmployeeShiftsOnDate(empId, date) {
    let rawData = await fs.readFile('assignments.json')
    assignmentList = JSON.parse(rawData)
    let shiftIds = []
    for (let asn of assignmentList) {
        if (asn.employeeId === empId) {
            shiftIds.push(asn.shiftId)
        }
    }

    rawData = await fs.readFile('shifts.json')
    shiftList = JSON.parse(rawData)
    let shiftDetails = []
    for (let sh of shiftList) {
        if (shiftIds.includes(sh.shiftId) && sh.date == date) {
            shiftDetails.push(sh)
        }
    }

    return shiftDetails
}

/**
 * Find a shift object give the employeeId and the shiftId.
 * @param {string} empId 
 * @param {string} shiftId 
 * @returns {{employeeId:string, shiftId:string}|undefined}
 */
async function findAssignment(empId, shiftId) {
    let rawData = await fs.readFile('assignments.json')
    assignmentList = JSON.parse(rawData)
    for (let asn of assignmentList) {
        if (asn.employeeId === empId && asn.shiftId === shiftId) {
            return asn
        }
    }
    return undefined
}

/**
 * Record a new assignment of an employee to a shift. This functions does not
 * check for existing combinations so it is possible to double book an employee,
 * use assignShift instead to check for this.
 * @param {string} empId 
 * @param {string} shiftId 
 */
async function addAssignment(empId, shiftId) {
    let rawData = await fs.readFile('assignments.json')
    assignmentList = JSON.parse(rawData)
    assignmentList.push({employeeId: empId, shiftId: shiftId})
    await fs.writeFile('assignments.json', JSON.stringify(assignmentList, null, 4))
}

/**
 * Add a new employee record to the system. The empId is automatically generated based
 * on the next available ID number from what is already in the file.
 * @param {{name:string, phone:string}} emp 
 */
async function addEmployeeRecord(emp) {
    let maxId = 0
    let rawData = await fs.readFile('employees.json')
    let employeeList = JSON.parse(rawData)
    for (let e of employeeList) {
        let eid = Number(e.employeeId.slice(1))
        if (eid > maxId) {
            maxId = eid
        }
    }
    emp.employeeId = `E${String(maxId+1).padStart(3,'0')}`
    employeeList.push(emp)
    await fs.writeFile('employees.json', JSON.stringify(employeeList, null, 4))
}

async function getDailyMaxHours() {
    let raw = await fs.readFile('config.json')
    let configuration = JSON.parse(raw)
    return configuration['maxDailyHours']
}

module.exports = {
    getAllEmployees, findEmployee,
    findShift, getEmployeeShifts,
    findAssignment, addAssignment,
    addEmployeeRecord,
    getDailyMaxHours, getEmployeeShiftsOnDate
}