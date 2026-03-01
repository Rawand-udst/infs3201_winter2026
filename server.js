const express = require('express')
const { engine } = require('express-handlebars')
const business = require('./business')

const app = express()

// Handlebars setup as view engine
app.engine('handlebars', engine({ defaultLayout: false }))
app.set('view engine', 'handlebars')
app.set('views', './views')

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: false }))


// Serve static files (CSS)
app.use(express.static('public'))

/**
 * GET / - landing page with list of employees
 * @param {Object} req - request object
 * @param {Object} res - response object
 * @returns {Promise<void>} - renders landing page with employee list
 */
app.get('/', async (req,res) => {
     let employees = await business.allEmployees()
    res.render('landing', { employees: employees })
})

/**
 * GET /employee/:employeeId - employee details page
 * @param {Object} req - request object with employeeId parameter
 * @param {Object} res - response object
 * @returns {Promise<void>} - renders employee details page with employee info and schedule
 */
app.get('/employee/:employeeId', async (req, res) => {
    let employeeId = req.params.employeeId;
    let details = await business.employeeDetails(employeeId);
    if (!details) {
        res.send('Employee not found')
        return
    }
    let shift = await business.getEmployeeSchedule(employeeId);
    for (let s of shift) {
        s.morningStart = business.isMorningTime(s.startTime);
        s.morningEnd = business.isMorningTime(s.endTime);
    }
    res.render('employee', { 
        employee: details, 
        shifts: shift 
    })
})

/**
 * GET /add - page to add a new employee
 * @param {Object} req - request object
 * @param {Object} res - response object
 * @return {Promise<void>} - renders add employee page
 */
app.get('/edit/:id', async function (req, res) {
    let employeeId = req.params.id;
    let details = await business.employeeDetails(employeeId);
    if (!details) {
        res.send('Employee not found')
        return
    }
    res.render('edit', { employee: details })
})

/**
 * POST /edit/:id - handle form submission to edit employee details
 * @param {Object} req - request object with employeeId parameter and form data (name, phone)
 * @param {Object} res - response object
 * @returns {Promise<void>} - validates input, updates employee, and redirects to employee details page
 */
app.post('/edit/:id', async function (req, res) {
    let employeeId = req.params.id;
    let name = req.body.name;
    let phone = req.body.phone;
    let err = await business.validateEmployeeEdit(employeeId, name, phone);
    if (err.length > 0) {
        res.send(err)
        return
    }
    //PRG pattern - redirect after POST to avoid resubmission on refresh
    res.redirect
})


app.listen(8000, function () {
    console.log("Application started http://localhost:8000")
})