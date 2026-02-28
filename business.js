const persistence = require("./persistence");

/**
 * Return all employees for landing page.
 */
async function allEmployees() {
  return await persistence.getAllEmployees();
}

/**
 * Return one employee object (or null) for details/edit pages.
 * @param {string} employeeId
 */
async function employeeDetails(employeeId) {
  return await persistence.getEmployeeDetails(employeeId);
}

/**
 * Convert "HH:MM" to minutes.
 * @param {string} hhmm
 * @returns {number}
 */
function timeToMinutes(hhmm) {
  let parts = (hhmm || "").split(":");
  let hh = Number(parts[0]);
  let mm = Number(parts[1]);
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

  let am = timeToMinutes(a.startTime);
  let bm = timeToMinutes(b.startTime);
  if (am < bm) return -1;
  if (am > bm) return 1;
  return 0;
}

/**
 * Manual insertion sort (no Array.sort()).
 * @param {Array<object>} shifts
 * @returns {Array<object>}
 */
function sortShifts(shifts) {
  let out = [];
  for (let i = 0; i < shifts.length; i++) {
    let item = shifts[i];
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
 * Build employee page model:
 * - employee object
 * - shifts sorted by date/time
 * - startTime < 12:00 marked with isMorning=true
 * @param {string} employeeId
 * @returns {Promise<{employee: object|null, shifts: Array<object>}>}
 */
async function employeePageModel(employeeId) {
  let emp = await persistence.getEmployeeDetails(employeeId);
  if (!emp) {
    return { employee: null, shifts: [] };
  }

  let assignments = await persistence.getAssignmentsForEmployee(employeeId);

  let shifts = [];
  for (let i = 0; i < assignments.length; i++) {
    let a = assignments[i];
    let s = await persistence.getShiftDetails(a.shiftId);
    if (s) {
      s.isMorning = timeToMinutes(s.startTime) < 12 * 60;
      shifts.push(s);
    }
  }

  shifts = sortShifts(shifts);

  return { employee: emp, shifts: shifts };
}

/**
 * Server-side validation for edit form.
 * @param {string} name
 * @param {string} phone
 * @returns {{ok:boolean, message:string, name:string, phone:string}}
 */
function validateEmployeeEdit(name, phone) {
  let n = (name || "").trim();
  let p = (phone || "").trim();

  if (n.length === 0) {
    return { ok: false, message: "Name must be non-empty.", name: n, phone: p };
  }

  let re = /^\d{4}-\d{4}$/;
  if (!re.test(p)) {
    return { ok: false, message: "Phone must be in the format 0000-0000.", name: n, phone: p };
  }

  return { ok: true, message: "", name: n, phone: p };
}

/**
 * Update employee name + phone (after validation).
 * @param {string} employeeId
 * @param {string} name
 * @param {string} phone
 */
async function updateEmployee(employeeId, name, phone) {
  return await persistence.updateEmployee(employeeId, name, phone);
}

module.exports = {
  allEmployees,
  employeeDetails,
  employeePageModel,
  validateEmployeeEdit,
  updateEmployee
};