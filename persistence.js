const { MongoClient } = require('mongodb')

let client = undefined;

const dns = require('dns');
dns.setServers(['8.8.8.8','8.8.4.4']);

/**
 * Connects to the MongoDB database if not already connected.
 * Uses a connection string to connect to the MongoDB Atlas cluster.
 * The client is stored in a variable to reuse the connection for subsequent calls.
 * @returns {Promise<void>} - resolves when the connection is established
 */
async function connectDatabase() {
  if (!client) {
    client = new MongoClient("mongodb+srv://Rawand_60304948:12class34@cluster0.0ztz6je.mongodb.net/");
    await client.connect();
  }
}

/**
 * Returns the database instance for the application to perform operations on.
 * @returns {Object} - the database instance
 */
function getDb() {
    return client.db('infs3201_winter2026');
}

/**
 * Loads all employees from the database.
 * @returns {Promise<Array>} - array of employee objects
 */
async function loadAllEmployees() {
  await connectDatabase();
  let db = getDb();
  let employees = db.collection("employees");
  let data = await employees.find().toArray()
  return data;
}

/**
 * Finds an employee by their ID.
 * @param {string} employeeId 
 * @returns {Promise<Object|null>} - employee object or null if not found
 */
async function findEmployee(employeeId) {
  await connectDatabase();
  let db = getDb();
  let employees = db.collection("employees");
  let result = await employees.findOne({ employeeId: employeeId });
  return result;
}

/**
 * Adds an employee to the database.
 * @param {Object} employee - the employee object to be added
 * @returns {Promise<void>} - resolves when the employee is added
 */
async function addEmployee(employee) {
  await connectDatabase();
  let db = getDb();
  let employees = db.collection("employees");
  await employees.insertOne(employee)
}

/**
 * Updates an employee in the database.
 * @param {string} employeeId - the ID of the employee to be updated
 * @param {string} name - the new name of the employee
 * @param {string} phone - the new phone number of the employee
 * @returns {Promise<boolean>} - true if the employee was updated, false otherwise
 */
async function updateEmployee(employeeId, name, phone) {
  await connectDatabase();
  let db = getDb();
  let employees = db.collection("employees");
  await employees.updateOne(
    { employeeId: employeeId },
    { $set: { name: name, phone: phone } }
  );
}

/**
 * Finds shifts assigned to an employee by their ID.
 * Joins the "assignments" collection to find shift IDs for the employee, then retrieves shift details from the "shifts" collection.
 * @param {string} employeeId - the ID of the employee whose shifts are to be retrieved
 * @returns {Promise<Array>} - array of shift objects for the given employee
 */
async function findShiftsByEmployee(employeeId) {
  await connectDatabase();
  let db = getDb();
  let assignmentsCollection = db.collection("assignments");
  let shiftsCollection = db.collection("shifts");
  let assignments = await assignmentsCollection.find({ employeeId: employeeId }).toArray();
  let shiftsID = [];
  for (let assignment of assignments) {
      shiftsID.push(assignment.shiftsID);
    }
  if (shiftsID.length === 0) {
      return []
  }
  let shifts = await shiftsCollection.find({ shiftID: { $in: shiftsID } }).toArray()

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
 * Loads config from config.json file. Configuration is not stored in the database.
 * @returns {Promise<Object>} The configuration object.
 */
async function loadConfig() {
    let fs = require('fs/promises')
    let raw = await fs.readFile('config.json', 'utf-8')
    return JSON.parse(raw)
}

module.exports = {
    loadAllEmployees,
    loadConfig,
    findEmployee,
    addEmployee,
    updateEmployee,
    findShiftsByEmployee
}