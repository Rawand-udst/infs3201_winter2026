import { getEmployeeByEmployeeId, getAssignmentsForEmployee, getShiftByShiftId } from "./persistence.js";

/**
 * Convert "HH:MM" to minutes.
 * @param {string} hhmm
 * @returns {number}
 */
function timeToMinutes(hhmm) {
  const parts = (hhmm || "").split(":");
  const hh = Number(parts[0]);
  const mm = Number(parts[1]);
  return hh * 60 + mm;
}

/**
 * Compare shifts by date then startTime.
 * @param {object} a
 * @param {object} b
 * @returns {number}
 */
function compareShift(a, b) {
  if (a.date < b.date) return -1;
  if (a.date > b.date) return 1;

  const am = timeToMinutes(a.startTime);
  const bm = timeToMinutes(b.startTime);
  if (am < bm) return -1;
  if (am > bm) return 1;
  return 0;
}

/**
 * Manual insertion sort (no Array.sort callback).
 * @param {Array<object>} shifts
 * @returns {Array<object>}
 */
function sortShifts(shifts) {
  const out = [];
  for (let i = 0; i < shifts.length; i++) {
    const item = shifts[i];
    let placed = false;

    for (let j = 0; j < out.length; j++) {
      if (compareShift(item, out[j]) < 0) {
        out.splice(j, 0, item);
        placed = true;
        break;
      }
    }
    if (!placed) out.push(item);
  }
  return out;
}

/**
 * Build employee details model.
 * @param {import("mongodb").Db} db
 * @param {string} employeeId
 * @returns {Promise<{employee: object|null, shifts: Array<object>}>}
 */
export async function buildEmployeeDetails(db, employeeId) {
  const employee = await getEmployeeByEmployeeId(db, employeeId);
  if (!employee) return { employee: null, shifts: [] };

  const assignments = await getAssignmentsForEmployee(db, employeeId);

  const shifts = [];
  for (let i = 0; i < assignments.length; i++) {
    const a = assignments[i];
    const shift = await getShiftByShiftId(db, a.shiftId);
    if (shift) {
      shift.isMorning = timeToMinutes(shift.startTime) < 12 * 60;
      shifts.push(shift);
    }
  }

  return { employee, shifts: sortShifts(shifts) };
}

/**
 * Validate edit employee input.
 * @param {string} name
 * @param {string} phone
 * @returns {{ok: boolean, message: string, name: string, phone: string}}
 */
export function validateEmployeeEdit(name, phone) {
  const n = (name || "").trim();
  const p = (phone || "").trim();

  if (n.length === 0) return { ok: false, message: "Name must be non-empty.", name: n, phone: p };
  if (!/^\d{4}-\d{4}$/.test(p)) return { ok: false, message: "Phone must be in the format 0000-0000.", name: n, phone: p };

  return { ok: true, message: "", name: n, phone: p };
}