const prompt = require('prompt-sync')();
const business = require('./business');

/**
 * List all employees with their ID, name, and phone number.
 * @returns {Promise<void>}
 */
async function listAllEmployees() {
    let employees = await business.allEmployees()

    console.log('Employee ID'.padEnd(13) + 'Name'.padEnd(20) + 'Phone')
    console.log('-----------'.padEnd(13) + '-------------------'.padEnd(20) + '---------')

    for (let e of employees) {
        let id = String(e.employeeId)
        let name = String(e.name)
        let phone = String(e.phone)
        console.log(id.padEnd(13) + name.padEnd(20) + phone)
    }
}

/**
 * Add a new employee.
 * @returns {Promise<void>}
 */
async function addNewEmployee() {
  let name = prompt('Enter employee name: ');
  let phone = prompt('Enter phone number: ');

  let result = await business.addEmployee(name, phone);
  console.log(result);
}

/**
 * Assign an employee to a shift.
 * @returns {Promise<void>}
 */
async function assignEmployeeToShift() {
  let employeeId = prompt('Enter employee ID: ');
  let shiftId = prompt('Enter shift ID: ');

  let result = await business.assignEmployeeToShift(employeeId, shiftId);
  console.log(result);
}

/**
 * View an employee schedule sorted by date and time.
 * @returns {Promise<void>}
 */
async function viewEmployeeSchedule() {
  let employeeId = prompt('Enter employee ID: ');
  let result = await business.viewEmployeeSchedule(employeeId);

  if (result.message && result.message.length > 0) {
    return console.log(result.message);
}
  if (result.records.length === 0){
     return console.log('No shifts found');
    }
  console.log('date,startTime,endTime');
  for (let res of result.records) {
        console.log(res.date + ',' + res.startTime + ',' + res.endTime)
    }
}

/**
 * Main menu loop.
 * @returns {Promise<void>}
 */
async function app() {
    while (true) {
        console.log('')
        console.log('1. Show all employees')
        console.log('2. Add new employee')
        console.log('3. Assign employee to shift')
        console.log('4. View employee schedule')
        console.log('5. Exit')

        let choice = Number(prompt('What is your choice> '))

        if (choice === 1) {
            await listAllEmployees()
        }
        else if (choice === 2) {
            await addNewEmployee()
        }
        else if (choice === 3) {
            await assignEmployeeToShift()
        }
        else if (choice === 4) {
            await viewEmployeeSchedule()
        }
        else if (choice === 5) {
            break
        }
        else {
            console.log('******** ERROR!!! Pick a number between 1 and 5')
        }
    }
}

app()