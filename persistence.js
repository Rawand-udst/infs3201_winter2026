const { MongoClient } = require("mongodb");

let client = undefined;

const DB_NAME = "infs3201_winter2026";

async function connectDatabase() {
  if (!client) {
    client = new MongoClient(
      "mongodb+srv://Rawand_60304948:12class34@cluster0.muybabo.mongodb.net/"
    );
    await client.connect();
  }
}

async function getAllEmployees() {
  await connectDatabase();
  let db = client.db(DB_NAME);
  let employees = db.collection("employees");
  let cursor = await employees.find({});
  let data = await cursor.toArray();
  return data;
}

async function getEmployeeDetails(employeeId) {
  await connectDatabase();
  let db = client.db(DB_NAME);
  let employees = db.collection("employees");
  let result = await employees.findOne({ employeeId: employeeId });
  return result;
}

async function getAssignmentsForEmployee(employeeId) {
  await connectDatabase();
  let db = client.db(DB_NAME);
  let assignments = db.collection("assignments");
  let cursor = await assignments.find({ employeeId: employeeId });
  let data = await cursor.toArray();
  return data;
}

async function getShiftDetails(shiftId) {
  await connectDatabase();
  let db = client.db(DB_NAME);
  let shifts = db.collection("shifts");
  let result = await shifts.findOne({ shiftId: shiftId });
  return result;
}

async function updateEmployee(employeeId, name, phone) {
  await connectDatabase();
  let db = client.db(DB_NAME);
  let employees = db.collection("employees");
  let result = await employees.updateOne(
    { employeeId: employeeId },
    { $set: { name: name, phone: phone } }
  );
  return result.modifiedCount > 0;
}

module.exports = {
  getAllEmployees,
  getEmployeeDetails,
  getAssignmentsForEmployee,
  getShiftDetails,
  updateEmployee
};