import express from "express";
import { openDb, getAllEmployees, getEmployeeByEmployeeId, updateEmployee } from "./persistence.js";
import { buildEmployeeDetails, validateEmployeeEdit } from "./business.js";

const app = express();
app.use(express.urlencoded({ extended: true }));

const PORT = 8000;

function getMongoUri() {
  const uri = process.env.MONGO_URI;
  if (!uri || uri.trim().length === 0) throw new Error("MONGO_URI missing.");
  return uri.trim();
}

const { db } = await openDb(getMongoUri());

function esc(s) {
  const str = String(s ?? "");
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function page(title, body) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<style>
body { font-family: Arial, sans-serif; padding: 16px; }
table { border-collapse: collapse; }
th, td { border: 1px solid #111; padding: 6px 10px; }
.morning { background: yellow; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

app.get("/", async (req, res) => {
  const employees = await getAllEmployees(db);
  let html = "<h1>Employees</h1><ul>";
  for (let i = 0; i < employees.length; i++) {
    const e = employees[i];
    html += `<li><a href="/employee/${esc(e.employeeId)}">${esc(e.name)}</a></li>`;
  }
  html += "</ul>";
  res.send(page("Employees", html));
});

app.get("/employee/:employeeId", async (req, res) => {
  const employeeId = req.params.employeeId;
  const model = await buildEmployeeDetails(db, employeeId);

  if (!model.employee) {
    res.status(404).send(page("Not Found", "<h1>Employee not found</h1><p><a href='/'>Back</a></p>"));
    return;
  }

  let html = `<h1>${esc(model.employee.name)}</h1>`;
  html += `<p><b>Phone:</b> ${esc(model.employee.phone)}</p>`;
  html += `<p><a href="/employee/${esc(employeeId)}/edit">Edit Details</a> | <a href="/">Back</a></p>`;

  html += "<h2>Shifts</h2><table><tr><th>Date</th><th>Start</th><th>End</th></tr>";
  for (let i = 0; i < model.shifts.length; i++) {
    const s = model.shifts[i];
    html += `<tr>
      <td>${esc(s.date)}</td>
      <td class="${s.isMorning ? "morning" : ""}">${esc(s.startTime)}</td>
      <td>${esc(s.endTime)}</td>
    </tr>`;
  }
  html += "</table>";

  res.send(page("Employee Details", html));
});

app.get("/employee/:employeeId/edit", async (req, res) => {
  const employeeId = req.params.employeeId;
  const e = await getEmployeeByEmployeeId(db, employeeId);

  if (!e) {
    res.status(404).send(page("Not Found", "<h1>Employee not found</h1><p><a href='/'>Back</a></p>"));
    return;
  }

  let html = "<h1>Edit Employee</h1>";
  html += `<form method="POST" action="/employee/${esc(employeeId)}/edit">`;
  html += `Name: <input name="name" value="${esc(e.name)}" /><br><br>`;
  html += `Phone: <input name="phone" value="${esc(e.phone)}" /><br><br>`;
  html += `<button type="submit">Save</button> <a href="/employee/${esc(employeeId)}">Cancel</a>`;
  html += `</form>`;

  res.send(page("Edit Employee", html));
});

app.post("/employee/:employeeId/edit", async (req, res) => {
  const employeeId = req.params.employeeId;
  const v = validateEmployeeEdit(req.body.name, req.body.phone);

  if (!v.ok) {
    res.status(400).send(page("Validation Error", `<h1>Error</h1><p>${esc(v.message)}</p><p><a href="/employee/${esc(employeeId)}/edit">Go back</a></p>`));
    return;
  }

  await updateEmployee(db, employeeId, v.name, v.phone);
  res.redirect("/");
});

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));