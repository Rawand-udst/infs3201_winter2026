const persistence = require('./persistence')

/**
 * Returns all employees.
 * @returns {Promise<Array>}
 */
async function allEmployees() {
  return await persistence.loadEmployeeData()
}

/**
 * Returns all shifts.
 * @returns {Promise<Array>}
 */
async function allShifts() {
  return await persistence.loadShiftData()
}

/**
  Returns true if value is empty or whitespace only.
 * @param {string} value
 * @returns {boolean}
*/
function isblank(value) {
  return value === null || value === undefined || value.trim().length === 0
}

/**
 * Validates an ID with a specific prefix and numeric part. 
 * @param {string} id 
 * @param {string} prefix 
 * @returns {boolean}
 */
function isValidId(id, prefix){
     if (typeof id !== 'string') {
        return false
    }
    if(id.length !==4){
        return false
    }
    if (id.substring(0, 1) !== prefix) {
        return false
    }
    let numPart = id.substring(1)
    let num = Number(numPart)
    if(Number.isNaN(num)){
        return false
    }

    return numPart === String(num).padStart(3, '0')
}

/**
 * Generates the next available employee ID with prefix 'E'.
 * @param {Array} employees 
 * @returns {string}
 */
function getNextId(employees){
    let maxId = 0
    for (let emp of employees) {
        let numId = Number(emp.employeeId.substring(1));
        if(numId > maxId && !Number.isNaN(numId)){
            maxId = numId;
        }
    }
    return 'E' + String(maxId + 1).padStart(3, '0')
}

/** 
 * Adds a new employee after validation.
 * @param {string} name
 * @param {string} phone
 * @returns {Promise<string>}
*/
async function addEmployee(name, phone) {
    if (isblank(name)) {
        return "Invalid name"
    }
    name = name.trim()

    if (name.length > 20) {
        return "Name too long (max 20 characters)"
    }

    if (isblank(phone)) {
        return "Invalid phone number"
    }
    phone = phone.trim()

    let employee = await persistence.loadEmployeeData()
    let newId = await getNextId(employee)

    await persistence.addNewEmployee({
        employeeId: newId,
        name: name,
        phone: phone
    })

    return "Employee added..."
}

/**
 * Computes the duration in hours between two times in "HH:MM" format.
 *
 * LLM used: ChatGPT
 * Prompt used: "Write a JavaScript function computeShiftDuration(startTime, endTime)
 * that returns the number of hours (as a real number) between two times in HH:MM format.
 * Example: 11:00 to 13:30 should return 2.5. Assume same day and endTime is after startTime."
 *
 * @param {string} startTime - "HH:MM"
 * @param {string} endTime - "HH:MM"
 * @returns {number} hours
 */
function computeShiftDuration(startTime, endTime) {
  let p1 = startTime.split(":");
  let p2 = endTime.split(":");

  let sh = Number(p1[0]);
  let sm = Number(p1[1]);

  let eh = Number(p2[0]);
  let em = Number(p2[1]);

  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;

  return (endMinutes - startMinutes) / 60;
}

/**
 * Checks if assigning a shift to an employee would exceed the daily hour limit.
 * @param {string} employeeId 
 * @param {object} shift 
 * @returns {Promise<boolean>}
 */
async function shiftWithinDLimit(employeeId, shift) {
    let config = await persistence.loadConfig();
    let maxDailyHours = config.maxDailyHours;
    let empShifts = await persistence.findShiftByEmpAndDate(employeeId, shift.date);
    let currentHours = 0;
    
    for (let s of empShifts) {
        currentHours += computeShiftDuration(s.startTime, s.endTime);
    }
    let newHours = computeShiftDuration(shift.startTime, shift.endTime);
    if (currentHours + newHours > maxDailyHours) {
        return false;
    }
    return true;

}

/**
 * Validates an employee ID. Checks if it's non-empty, has the correct format, and exists in the system.
 * @param {string} employeeId 
 * @returns {Promise<string|null>}
 */
async function validateEmployee(employeeId) {
    if (isblank(employeeId)) {
        return "Invalid employee ID"
    }
    employeeId = employeeId.trim()

    if (!isValidId(employeeId, 'E')) {
        return "Invalid, Employee ID must start with 'E' followed by 3 digits"
    }
    let emp = await persistence.findEmployeeById(employeeId);
    if (!emp) {
        return "Employee not found"
    }
    return null;
}

/**
 * Validates a shift ID. Checks if it's non-empty, has the correct format, and exists in the system.
 * @param {string} shiftId 
 * @returns {Promise<string|null>}
 */
async function validShift(shiftId) {
    if (isblank(shiftId)) {
        return "Invalid shift ID"
    }
    shiftId = shiftId.trim()
    if (!isValidId(shiftId, 'S')) {
        return "Invalid, Shift ID must start with 'S' followed by 3 digits"
    }
    let shift = await persistence.findShift(shiftId);
    if (!shift) {
        return "Shift not found"
    }
    return null;
}

/**
 * Checks if an employee is already assigned to a shift.
 * @param {string} employeeId 
 * @param {string} shiftId 
 * @returns {Promise<string|null>}
 */
async function AssignmentDuplicate(employeeId, shiftId) {
    if (await persistence.assignmentExist(employeeId, shiftId)) {
        return "Employee already assigned to this shift"
    }
    return null;
}

/**
 * Checks if assigning a shift to an employee would exceed the daily hour limit.
 * @param {string} employeeId 
 * @param {string} shiftId 
 * @returns {Promise<string|null>}
 */
async function dailyLimit(employeeId, shiftId) {
    let shift = await persistence.findShift(shiftId);
    let withinLimit = await shiftWithinDLimit(employeeId, shift);
    if (!withinLimit) {
        let config = await persistence.loadConfig();
        return "Cannot assign. Daily limit = " + config.maxDailyHours + " hours.";
    }
    return null;
}

/**
 * Validates the employee and shift IDs, checks for duplicate assignments and daily hour limits,
 * @param {string} empId 
 * @param {string} shiftId 
 * @returns {Promise<string>}
 */
async function assignEmployeeToShift(empId, shiftId) {
    let empError = await validateEmployee(empId);
    if (empError) return empError;

    let shiftError = await validShift(shiftId);
    if (shiftError) return shiftError;

    let duplicateError = await AssignmentDuplicate(empId, shiftId);
    if (duplicateError) return duplicateError;

    let limitError = await dailyLimit(empId, shiftId);
    if (limitError) return limitError;

    await persistence.addAssignment(empId, shiftId);
    return "Assigned successfully"

}

/**
 * Compares two shifts based on their date and start time.
 * @param {object} shiftA 
 * @param {object} shiftB 
 * @returns {number}
 */
function shiftComparasion(shiftA, shiftB) {
    let a = shiftA.date + shiftA.startTime;
    let b = shiftB.date + shiftB.startTime;
    if (a > b) {
        return 1
    }
    else if (a < b) {
        return -1
    }
    else {
        return 0
    }
}

/**
 * Basic bubble sort to sort shifts by date and start time. Used in viewEmployeeSchedule.
 * @param {Array} shifts 
 * @returns {Promise<void>}
 */
async function sortShifts(shifts) {
    let sorted = shifts.length
    for (let i = 0; i < sorted - 1; i++) {
        let swap = false
        for (let j = i + 1; j < sorted; j++) {
            if (await shiftComparasion(shifts[i], shifts[j]) > 0) {
                let temp = shifts[i];
                shifts[i] = shifts[j];
                shifts[j] = temp;
                swap = true
            }
        }
        if (!swap) {
            break;
        }
    }
}

/**
 * Views the schedule of an employee by validating the employee ID, retrieving their assigned shifts, and sorting them by date and start time.
 * @param {string} empId 
 * @returns {Promise<object>}
 */
async function viewEmployeeSchedule(empId) {
    let empError = await validateEmployee(empId);
    if (empError) {
        return { message: empError, records: [] }
    }

    empId = empId.trim()
    let record = await persistence.findShiftByEmployee(empId);
    await sortShifts(record);

    return { message: '', records: record }
}

module.exports = {
    allEmployees,
    allShifts,
    isblank,
    isValidId,
    getNextId,
    addEmployee,
    computeShiftDuration,
    shiftWithinDLimit,
    validateEmployee,
    validShift,
    AssignmentDuplicate,
    dailyLimit,
    assignEmployeeToShift,
    shiftComparasion,
    sortShifts,
    viewEmployeeSchedule,
};
