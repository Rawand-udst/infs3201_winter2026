import fs from "fs";
import { openDb } from "./persistence.js";

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf-8"));
}

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error("MONGO_URI missing.");
  process.exit(1);
}

const { db, client } = await openDb(uri);

try {
  const employees = readJson("./employees.json");
  const shifts = readJson("./shifts.json");
  const assignments = readJson("./assignments.json");

  await db.collection("employees").deleteMany({});
  await db.collection("shifts").deleteMany({});
  await db.collection("assignments").deleteMany({});

  if (employees.length) await db.collection("employees").insertMany(employees);
  if (shifts.length) await db.collection("shifts").insertMany(shifts);
  if (assignments.length) await db.collection("assignments").insertMany(assignments);

  console.log("Seed complete ✅");
} finally {
  await client.close();
}