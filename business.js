const persistence = require("./persistence");

/**
 * Return all employees from the database for the landing page. Each employee object should have employeeId, name, and phone properties.
 * @returns {Promise<Array>} - array of employee objects
 */
async function allEmployees() {
  return await persistence.loadAllEmployees();
}

/**
 * Checks if a value is blank (null, undefined, or empty string).
 * @param {string} value - the value to check
 * @returns {boolean} - true if the value is blank, false otherwise
 */
function isBlank(value) {
    return value === null || value === undefined || value.trim().length === 0
}  

/**
 * Gets the next employee ID in the format "E###" based on the existing employee IDs.
 * @param {Array<Object>} employees - array of employee objects
 * @returns {string} - the next employee ID in the format "E###"
 */
function getNextEmployeeId(employees) {
    let maxId = 0;
    for (let emp of employees) {
        let idNum = Number(emp.employeeId.substring(1));
        if (!Number.isNaN(idNum) && idNum > maxId) {
            maxId = idNum;
        }
    }
    return "E" + (maxId + 1).toString().padStart(3, "0")
}

/**
 * Validates the input for adding a new employee and adds the employee to the database if valid.
 * @param {string} name - the name of the employee  
 * @param {string} phone - the phone number of the employee
 * @returns {string} - success message or error message
 */
async function addEmployee(name, phone) {
  if (isBlank(name)) {
    return 'Invalid name. Employee not added.';
  }
  name = name.trim();

  if (name.length > 20) {
      return 'Name too long (max 20 characters)'
  }

  if (isBlank(phone)) {
    return 'Invalid phone. Employee not added.';
  }
  phone = phone.trim();
  
  let employees = await persistence.loadEmployees();
  let newEmployee = getNextEmployeeId(employees);
  await persistence.addEmployee({ 
    employeeId: newEmployee, 
    name: name, 
    phone: phone 
  });

  return 'Employee added...'
}


/**
 * Return one employee object (or null) for details/edit pages.
 * @param {string} employeeId
 * @returns {Promise<Object|null>} - employee object or null if not found
 */
async function employeeDetails(employeeId) {
  return await persistence.findEmployee(employeeId);
}

/**
 * Validates the phone number format (should be "0000-0000").
 * @param {string} phone - the phone number to validate
 * @returns {boolean} - true if phone is in valid format, false otherwise
 */
function validPhoneFormat(phone) {
  if (phone.length !== 9) {
        return false
  }
  if (phone[4] !== '-') {
        return false
  }
  for (let i = 0; i < phone.length; i++) {
        if (i === 4) continue
        let c = phone[i]
        if (code < 48 || code > 57) {
            return false
        }
  }
  return true
}

/**
 * Compare shifts by date then startTime.
 * @param {object} a - first shift object with date and startTime properties
 * @param {object} b - second shift object with date and startTime properties
 * @returns {number} -1 if a < b, 1 if a > b, 0 if equal
 */
function compareShift(a, b) {
  if (a.date < b.date) return -1;
  if (a.date > b.date) return 1;

  let am = timeToMinutes(a.startTime);
  let bm = timeToMinutes(b.startTime);
  if (am < bm) return -1;
  if (am > bm) return 1;
  return 0;
}

/**
 * Sort shifts by date then startTime using bubble sort 
 * @param {Array<object>} shifts - array of shift objects with date and startTime properties
 * @returns {void} - sorts the shifts array in place
 */
function sortShifts(shifts) {
  let num = shifts.length
  for (let i = 0; i < num -1; i++) {
    let swap = false
    for (let j = 0; j < num - i - 1; j++) {
      if (compareShift(shifts[j], shifts[j+1]) > 0) {
        let temp = shifts[j]
        shifts[j] = shifts[j+1]
        shifts[j+1] = temp
        swap = true
      }
    }
    if (!swap) break;
  }
  return shifts;
}

/**
 * Returns the schedule (shifts) for a given employee, sorted by date and start time.
 * @param {string} employeeId - the ID of the employee whose schedule is to be retrieved
 * @returns {Promise<Array>} - array of shift objects sorted by date and startTime
 */
async function getEmployeeSchedule(employeeId) {
  let shifts = await persistence.findShiftsByEmployee(employeeId);
  return sortShifts(shifts);
}

/**
 * Checks if a given time is in the morning (before 12:00).
 * @param {string} time - time in HH:MM format
 * @returns {boolean} - true if the time is in the morning (before 12:00), false otherwise
 */
function isMorningTime(time) {
  let hours = Number(time.substring(0, 2));
  return hours < 12;
}

/**
 * Update employee details in the database after validating the input. Returns a success message or an error message if validation fails.
 * @param {string} employeeId - the ID of the employee to update
 * @param {string} name -  the new name of the employee
 * @param {string} phone - the new phone number of the employee
 * @return {Promise<string>} - success message or error message
 */
async function updateEmployee(employeeId, name, phone) {
  if (isBlank(name)) {
        return 'Name cannot be empty'
  }
  name = name.trim();
  if(isBlank(phone)) {
        return 'Phone cannot be empty'
  }
  phone = phone.trim();
  if (!validPhoneFormat(phone)) {
        return 'Phone must be in the format 0000-0000'
  }
  await persistence.updateEmployee(employeeId, name, phone);
  return 'Employee updated...'
}

module.exports = {
    allEmployees,
    addEmployee,
    employeeDetails,
    updateEmployee,
    getEmployeeSchedule,
    isMorningTime
}