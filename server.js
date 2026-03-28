const express = require('express')
const { engine } = require('express-handlebars')
const business = require('./business')
const persistence = require('./persistence')

const app = express()

app.engine('handlebars', engine({ defaultLayout: false }))
app.set('view engine', 'handlebars')
app.set('views', './views')

app.use(express.urlencoded({ extended: false }))
app.use(express.static('public'))

/**
 * Parses cookies from request headers.
 * @param {Object} req
 * @returns {Object} 
 */
function parseCookies(req) {
    let result = {}
    let cookieHeader = req.headers.cookie
    if (!cookieHeader) {
        return result
    }

    let pieces = cookieHeader.split(';')
    for (let i = 0; i < pieces.length; i++) {
        let part = pieces[i].trim()
        let eq = part.indexOf('=')
        if (eq >= 0) {
            let key = part.substring(0, eq)
            let value = part.substring(eq + 1)
            result[key] = value
        }
    }
    return result
}

/**
 * Security log middleware.
 */
app.use(async function (req, res, next) {
    let cookies = parseCookies(req)
    let username = 'unknown'

    if (cookies.sessionKey) {
        let session = await persistence.getSession(cookies.sessionKey)
        if (session && session.data && session.data.username) {
            username = session.data.username
        }
    }

    await persistence.logSecurityAccess({
        timestamp: new Date(),
        username: username,
        url: req.originalUrl,
        method: req.method
    })

    next()
})

/**
 * Auth middleware.
 */
app.use(async function (req, res, next) {
    if (req.path === '/login' || req.path === '/logout') {
        next()
        return
    }

    let cookies = parseCookies(req)
    let sessionKey = cookies.sessionKey

    if (!sessionKey) {
        res.redirect('/login?msg=Please log in first')
        return
    }

    let session = await persistence.getSession(sessionKey)
    if (!session) {
        res.setHeader('Set-Cookie', 'sessionKey=; Max-Age=0; Path=/')
        res.redirect('/login?msg=Session expired. Please log in again')
        return
    }

    let newExpiry = new Date(Date.now() + 1000 * 60 * 5)
    await persistence.updateSessionExpiry(sessionKey, newExpiry)

    res.locals.username = session.data.username
    next()
})

app.get('/login', function (req, res) {
    let msg = req.query.msg
    res.render('login', { msg: msg })
})

app.post('/login', async function (req, res) {
    let username = req.body.username
    let password = req.body.password

    let sd = await business.attemptLogin(username, password)
    if (!sd) {
        res.redirect('/login?msg=Invalid username or password')
        return
    }

    res.setHeader(
        'Set-Cookie',
        'sessionKey=' + sd.key + '; Max-Age=300; HttpOnly; Path=/'
    )
    res.redirect('/')
})

app.get('/logout', async function (req, res) {
    let cookies = parseCookies(req)
    if (cookies.sessionKey) {
        await persistence.deleteSession(cookies.sessionKey)
    }

    res.setHeader('Set-Cookie', 'sessionKey=; Max-Age=0; Path=/')
    res.redirect('/login?msg=Logged out successfully')
})

app.get('/', async function (req, res) {
    let employees = await business.allEmployees()
    res.render('landing', {
        employees: employees,
        username: res.locals.username
    })
})

app.get('/employee/:employeeId', async function (req, res) {
    let employeeId = req.params.employeeId
    let details = await business.employeeDetails(employeeId)

    if (!details) {
        res.send('Employee not found')
        return
    }

    let shifts = await business.getEmployeeSchedule(employeeId)
    for (let i = 0; i < shifts.length; i++) {
        shifts[i].isMorningStart = business.isMorningTime(shifts[i].startTime)
        shifts[i].isMorningEnd = business.isMorningTime(shifts[i].endTime)
    }

    res.render('employeeDetails', {
        employee: details,
        shifts: shifts,
        username: res.locals.username
    })
})

app.get('/edit/:id', async function (req, res) {
    let employeeId = req.params.id
    let details = await business.employeeDetails(employeeId)

    if (!details) {
        res.send('Employee not found')
        return
    }

    res.render('editEmployee', {
        employee: details,
        username: res.locals.username
    })
})

app.post('/edit/:id', async function (req, res) {
    let employeeId = req.params.id
    let name = req.body.name
    let phone = req.body.phone
    let photo = req.body.photo

    let err = await business.updateEmployee(employeeId, name, phone, photo)
    if (err.length > 0) {
        res.send(err)
        return
    }

    res.redirect('/employee/' + employeeId)
})

app.listen(8000, function () {
    console.log('Application started http://localhost:8000')
})