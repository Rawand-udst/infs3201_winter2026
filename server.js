const express = require('express')
const business = require('./business.js')
const bodyParser = require('body-parser')

app = express()
let urlencodedParser = bodyParser.urlencoded({extended: false})
app.use(urlencodedParser)

app.get('/', async (req,res) => {
    let result = ""
    let employees = await business.allEmployees()

    result += "<h1>Main Page</h1>"
    result += "<h3>Employees</h3>"
    result += "<ul>"
    for (e of employees) {
        result += `<li><a href='/employee-details?employeeId=${e.employeeId}'>${e.name}</a></li>`
    }
    result += "</ul>"
    res.send(result)
})

app.get('/employee-details', async (req, res) => {
    let employeeId = req.query.employeeId
    let model = await business.employeePageModel(employeeId)

    if (!model.employee) {
        res.send("No employee found<br><br><a href='/'>Back</a>")
        return
    }

    let html = `
    <style>
        table { border-collapse: collapse; }
        th, td { border: 1px solid black; padding: 6px; }
        .morning { background: yellow; }
    </style>
    `
    html += "<h1>Employee Details</h1>"
    html += `Employee ID: ${model.employee.employeeId}<br>`
    html += `Name: ${model.employee.name}<br>`
    html += `Phone: ${model.employee.phone}<br><br>`

    html += `<a href='/edit-employee?employeeId=${model.employee.employeeId}'>Edit Details</a>`
    html += "<br><br>"

    html += "<h2>Shifts</h2>"
    html += "<table>"
    html += "<tr><th>Date</th><th>Start</th><th>End</th></tr>"

    for (s of model.shifts) {
        let cls = ""
        if (s.isMorning) cls = "morning"
        html += `<tr><td>${s.date}</td><td class='${cls}'>${s.startTime}</td><td>${s.endTime}</td></tr>`
    }

    html += "</table>"
    html += "<br><a href='/'>Back</a>"
    res.send(html)
})

app.get('/edit-employee', async (req, res) => {
    let employeeId = req.query.employeeId
    let emp = await business.employeeDetails(employeeId)

    if (!emp) {
        res.send("No employee found<br><br><a href='/'>Back</a>")
        return
    }

    let html = "<h1>Edit Employee</h1>"
    html += "<form method='post'>"
    html += `Employee ID: ${emp.employeeId}<br><br>`
    html += `Name: <input name='name' value='${emp.name}'><br><br>`
    html += `Phone: <input name='phone' value='${emp.phone}'><br><br>`
    html += "<input type='submit' value='Save'>"
    html += "</form>"
    html += "<br><a href='/'>Back</a>"
    res.send(html)
})

app.post('/edit-employee', async (req, res) => {
    let employeeId = req.query.employeeId
    let name = req.body.name
    let phone = req.body.phone

    let check = business.validateEmployeeEdit(name, phone)
    if (!check.ok) {
        res.send(`Error: ${check.message}<br><br><a href='/edit-employee?employeeId=${employeeId}'>Go back</a>`)
        return
    }

    let ok = await business.updateEmployee(employeeId, check.name, check.phone)

    if (ok) {
        // PRG style: after POST redirect to GET
        res.redirect('/')
    }
    else {
        res.send("Update failed<br><br><a href='/'>Back</a>")
    }
})

app.listen(8000, () => {
    console.log("Application started http://localhost:8000")
})