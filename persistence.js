import { MongoClient } from "mongodb";

const DB_NAME = "infs3201_winter2026";

/**
 * Open a MongoDB database connection.
 * @param {string} mongoUri
 * @returns {Promise<{db: import("mongodb").Db, client: MongoClient}>}
 */
export async function openDb(mongoUri) {
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(DB_NAME);
  return { db, client };
}

/**
 * Get all employees.
 * @param {import("mongodb").Db} db
 * @returns {Promise<Array<object>>}
 */
export async function getAllEmployees(db) {
  return await db.collection("employees").find({}).toArray();
}

/**
 * Get one employee by employeeId.
 * @param {import("mongodb").Db} db
 * @param {string} employeeId
 * @returns {Promise<object|null>}
 */
export async function getEmployeeByEmployeeId(db, employeeId) {
  return await db.collection("employees").findOne({ employeeId: employeeId });
}

/**
 * Update employee.
 * @param {import("mongodb").Db} db
 * @param {string} employeeId
 * @param {string} name
 * @param {string} phone
 * @returns {Promise<boolean>}
 */
export async function updateEmployee(db, employeeId, name, phone) {
  const res = await db.collection("employees").updateOne(
    { employeeId: employeeId },
    { $set: { name: name, phone: phone } }
  );
  return res.matchedCount === 1;
}

/**
 * Get assignments for employeeId.
 * @param {import("mongodb").Db} db
 * @param {string} employeeId
 * @returns {Promise<Array<object>>}
 */
export async function getAssignmentsForEmployee(db, employeeId) {
  return await db.collection("assignments").find({ employeeId: employeeId }).toArray();
}

/**
 * Get shift by shiftId.
 * @param {import("mongodb").Db} db
 * @param {string} shiftId
 * @returns {Promise<object|null>}
 */
export async function getShiftByShiftId(db, shiftId) {
  return await db.collection("shifts").findOne({ shiftId: shiftId });
}