const fs = require('fs/promises');

/** 
 * This function will read the employees.json file and return an array of JSON objects
 * that represent the employees in the system.
 * @param {} 
 * @returns {Promise<Array>}
 */
async function loadEmployeeData() {
    let data = await fs.readFile('employees.json', 'utf-8');

    let employees = JSON.parse(data);

    return employees;
};

/** This function will save the employeeList array of employees into the file employees.json. 
 * @param {Array} employeeList
 * @return {Promise<void>}
*/
async function saveEmployeeData(employeeList) {
    await fs.writeFile("employees.json", JSON.stringify(employeeList));
};


/** 
 * This function will read the shifts.json file and return an array of JSON objects
 * that represent the shifts in the system.
 * @param {} 
 * @returns {Promise<Array>}
*/
async function loadShiftData() {
    let data = await fs.readFile('shifts.json', 'utf-8');

    let shifts = JSON.parse(data);

    return shifts;
};

/**
 * This function will save the shiftList array of shifts into the file shifts.json.
 * @param {Array} shiftList
 * @return {Promise<void>}
*/
async function saveShiftData(shiftList) {
    await fs.writeFile("shifts.json", JSON.stringify(shiftList));
};

/** 
 * This function will read the assignments.json file and return an array of JSON objects
 * that represent the assignments in the system.
 * @param {} 
 * @returns {Promise<Array>}
*/
async function loadAssignmentData() {
    let data = await fs.readFile('assignments.json', 'utf-8');

    let assignments = JSON.parse(data);

    return assignments;
};

/** 
 * This function will save the assignmentList array of assignments into the file assignments.json.
 * @param {Array} assignmentList
 * @return {Promise<void>}
 */
async function saveAssignmentData(assignmentList) {
    await fs.writeFile("assignments.json", JSON.stringify(assignmentList));
};

/**
 * Loads config from config.json and returns the config object.
 * @returns {Promise<Object>}
 */
async function loadConfig() {
    let raw = await fs.readFile('config.json', 'utf-8')
    return JSON.parse(raw)
}

/**
 * Finds an single employee by their ID and returns the employee object if found, otherwise returns undefined.
 * @param {string} employeeId
 * @returns {Promise<Object|undefined>}
 */
async function findEmployeeById(empId) {
    let employees = await loadEmployeeData();

    for (let employee of employees) {
        if (employee.employeeId === empId) {
            return employee;
        }
    }
    return undefined;
}

/**
 * Finds a single shift by its ID and returns the shift object if found, otherwise returns undefined.
 * @param {string} shiftId
 * @returns {Promise<Object|undefined>}
 */
async function findShift(shiftId) {
    let shifts = await loadShiftData();

    for (let shift of shifts) {
        if (shift.shiftId === shiftId) {
            return shift;
        }
    }
    return undefined;
}

/**
 * Checks if an assignment exists for the given employeeId and shiftId.
 * @param {string} employeeId 
 * @param {string} shiftId 
 * @returns {Promise<boolean>}
 */
async function assignmentExist(employeeId, shiftId) {
    let assignments = await loadAssignmentData();

    for (let assignment of assignments) {
        if (assignment.employeeId === employeeId && assignment.shiftId === shiftId) {
            return true;
        }
    }
    return false;
}

/**
 * Adds a new employee to the system.
 * @param {Object} employee 
 * @returns {Promise<void>}
 */
async function addNewEmployee(employee) {
   let employees = await loadEmployeeData()
    employees.push(employee)
    await saveEmployeeData(employees)
};

/**
 * This function will add a new assignment to the system.
 * @param {string} employeeId 
 * @param {string} shiftId 
 * @return {Promise<void>}
 */
async function addAssignment(employeeId, shiftId) {
    let assignments = await loadAssignmentData();

    assignments[assignments.length] = {
        employeeId: employeeId,
        shiftId: shiftId
    };
    
    await saveAssignmentData(assignments);
}

/**
 * Finds all shift details assigned to a specific employee.
 * @param {string} employeeId
 * @returns {Promise<Array>}
 */
async function findShiftByEmployee(employeeId) {
    let assignments = await loadAssignmentData();
    let shifts = await loadShiftData();

    let res = []

    for (let assignment of assignments) {
        if (assignment.employeeId === employeeId) {
            for (let shift of shifts) {
                if (shift.shiftId === assignment.shiftId) {
                    res.push({
                        id: shift.shiftId,
                        date: shift.date,
                        startTime: shift.startTime,
                        endTime: shift.endTime
                    })
                }
            }
        }
    }

    return res;
}

/**
 * Finds all shifts for an employee on a specific date.
 * @param {string} employeeId
 * @param {string} date
 * @returns {Promise<Array>}
 */
async function findShiftByEmpAndDate(employeeId, date) {
    let assignments = await loadAssignmentData();
    let shifts = await loadShiftData();

    let result = []

    for (let assignment of assignments) {
        if (assignment.employeeId === employeeId) {
            for (let shift of shifts) {
                if (shift.shiftId === assignment.shiftId && shift.date === date) {
                    result.push({
                        id: shift.shiftId,
                        date: shift.date,
                        startTime: shift.startTime,
                        endTime: shift.endTime
                    })
                }
            }
        }
    }

    return result;
}

module.exports = {
    loadEmployeeData,
    loadShiftData,
    loadAssignmentData,
    loadConfig,
    findEmployeeById,
    findShift,
    assignmentExist,
    addNewEmployee,
    addAssignment,
    findShiftByEmployee,
    findShiftByEmpAndDate,
}