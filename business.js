const persistence = require('./persistence.js')

/**
 * Return a list of all employees loaded from the storage.
 * @returns {Array<{ employeeId: string, name: string, phone: string }>} List of employees
 */
async function getAllEmployees() {
    return await persistence.getAllEmployees()
}


/**
 * Get a list of shiftIDs for an employee.
 * @param {string} empId 
 * @returns {Array<{string}>}
 */
async function getEmployeeShifts(empId) {
    return await persistence.getEmployeeShifts(empId)
}


/**
 * Add a new employee record to the system. The empId is automatically generated based
 * on the next available ID number from what is already in the file.
 * @param {{name:string, phone:string}} emp 
 */
async function addEmployeeRecord(emp) {
    return await persistence.addEmployeeRecord(emp)
}

/**
 * This function attempts to assign a shift to an employee. This function checks to ensure
 * that the employee exists, the shift exists, and that the combination employee/shift has 
 * not already been recorded.
 * 
 * The function currently returns string messages indicating whether the operation was successful
 * or why it failed.  A serious improvement would be to use exceptions; this will be refactored
 * at a later time.
 * 
 * @param {string} empId 
 * @param {string} shiftId 
 * @returns {string} A message indicating the problem of the word "Ok"
 */
async function assignShift(empId, shiftId) {
    return await persistence.assignShift(empId, shiftId)
}


/**
 * This function attempts to assign a shift to an employee. This function checks to ensure
 * that the employee exists, the shift exists, and that the combination employee/shift has 
 * not already been recorded.
 * 
 * The function currently returns string messages indicating whether the operation was successful
 * or why it failed.  A serious improvement would be to use exceptions; this will be refactored
 * at a later time.
 * 
 * NOTE: The referential integrity check here is being done in the business layer because we want to
 * make sure that we don't assign non-existent employees to non-existing shifts.  We are also checking
 * that the same employee is not assigned to the same shift multiple times.  If this check were implemented
 * as well in the persistence it would be okay (i.e. FK and PK constraints).. it *should* still be done
 * here because it is really a business rule as well.
 * 
 * @param {string} empId 
 * @param {string} shiftId 
 * @returns {string} A message indicating the problem of the word "Ok"
 */
async function assignShift(empId, shiftId) {
    // check that empId exists
    let employee = await persistence.findEmployee(empId)
    if (!employee) {
        return "Employee does not exist"
    }
    // check that shiftId exists
    let shift = await persistence.findShift(shiftId)
    if (!shift) {
        return "Shift does not exist"
    }
    // check that empId,shiftId doesn't exist already
    let assignment = await persistence.findAssignment(empId, shiftId)
    if (assignment) {
        return "Employee already assigned to shift"
    }


    // make sure that the new assignment will not violate the rule on the
    // number of hours per day.. this should be a separate function.
    let maxHours = await persistence.getDailyMaxHours()
    let currentShifts = await persistence.getEmployeeShiftsOnDate(empId, shift.date)
    let newShiftLength = computeShiftDuration(shift.startTime, shift.endTime)
    let scheduledHours = 0
    for (let s of currentShifts) {
        scheduledHours += computeShiftDuration(s.startTime, s.endTime)
    }
    let newAllocation = newShiftLength + scheduledHours
    console.log(`employee has ${scheduledHours} hours already, with new shift this will be ${newAllocation}`)
    if (newAllocation > maxHours) {
        return "Hour Violation"
    }

    // add empId,shiftId into the bridge
    await persistence.addAssignment(empId, shiftId)
    
    return "Ok"
}

/**
 * Computes the duration of a shift in hours.  From ChatGPT!
 *
 * @param {string} startTime Time in HH:MM (24-hour format)
 * @param {string} endTime   Time in HH:MM (24-hour format)
 * @returns {number} Length of the shift in hours
 */
function computeShiftDuration(startTime, endTime) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;

  return (endTotalMinutes - startTotalMinutes) / 60;
}


module.exports = {
    getAllEmployees, assignShift, addEmployeeRecord, getEmployeeShifts
}