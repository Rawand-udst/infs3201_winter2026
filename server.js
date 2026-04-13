const express = require('express')
const { engine } = require('express-handlebars')
const business = require('./business')
const persistence = require('./persistence')
const multer = require('multer')
const path = require('path')

const app = express()

// Configure multer for memory storage (we'll handle file saving ourselves)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024 // 2 MB limit  
    }
})

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
 * Auth middleware - allows login, logout, verify-2fa routes without auth.
 */
app.use(async function (req, res, next) {
    // Allow access to auth-related routes without a session
    if (req.path === '/login' || req.path === '/logout' || req.path === '/verify-2fa') {
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

// ============================================
// Authentication Routes
// ============================================

app.get('/login', function (req, res) {
    let msg = req.query.msg
    res.render('login', { msg: msg })
})

app.post('/login', async function (req, res) {
    let username = req.body.username
    let password = req.body.password

    let result = await business.validateCredentials(username, password)
    
    if (!result.success) {
        res.redirect('/login?msg=' + encodeURIComponent(result.error))
        return
    }

    if (result.requires2FA) {
        // Set temporary cookie for 2FA verification
        res.setHeader(
            'Set-Cookie',
            'tempKey=' + result.tempKey + '; Max-Age=180; HttpOnly; Path=/'
        )
        res.redirect('/verify-2fa')
        return
    }

    // This shouldn't happen with 2FA enabled, but just in case
    res.redirect('/')
})

app.get('/verify-2fa', function (req, res) {
    let cookies = parseCookies(req)
    if (!cookies.tempKey) {
        res.redirect('/login?msg=Please log in first')
        return
    }
    
    let msg = req.query.msg
    res.render('verify2fa', { msg: msg })
})

app.post('/verify-2fa', async function (req, res) {
    let cookies = parseCookies(req)
    let tempKey = cookies.tempKey
    let code = req.body.code

    if (!tempKey) {
        res.redirect('/login?msg=2FA session expired. Please log in again')
        return
    }

    let session = await business.verify2FACode(tempKey, code)
    
    if (!session) {
        res.redirect('/verify-2fa?msg=Invalid or expired code. Please try again.')
        return
    }

    // Clear the temp key and set the session key
    res.setHeader('Set-Cookie', [
        'tempKey=; Max-Age=0; Path=/',
        'sessionKey=' + session.key + '; Max-Age=300; HttpOnly; Path=/'
    ])
    res.redirect('/')
})

app.get('/logout', async function (req, res) {
    let cookies = parseCookies(req)
    if (cookies.sessionKey) {
        await persistence.deleteSession(cookies.sessionKey)
    }

    res.setHeader('Set-Cookie', [
        'sessionKey=; Max-Age=0; Path=/',
        'tempKey=; Max-Age=0; Path=/'
    ])
    res.redirect('/login?msg=Logged out successfully')
})

// ============================================
// Main Application Routes
// ============================================

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

    // Get employee documents
    let documents = await business.getEmployeeDocuments(employeeId)

    // Get query params for document upload feedback
    let docError = req.query.docError
    let docSuccess = req.query.docSuccess

    res.render('employeeDetails', {
        employee: details,
        shifts: shifts,
        documents: documents,
        docError: docError,
        docSuccess: docSuccess,
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

// ============================================
// Document Upload Routes
// ============================================

/**
 * Upload document for an employee.
 * Protected route - requires authentication.
 */
app.post('/employee/:employeeId/documents/upload', upload.single('document'), async function (req, res) {
    let employeeId = req.params.employeeId
    
    // Check if employee exists
    let employee = await business.employeeDetails(employeeId)
    if (!employee) {
        res.status(404).send('Employee not found')
        return
    }

    // Handle multer errors
    if (!req.file) {
        res.redirect('/employee/' + employeeId + '?docError=' + encodeURIComponent('No file uploaded'))
        return
    }

    // Save the document
    let result = await business.saveEmployeeDocument(employeeId, req.file)
    
    if (!result.success) {
        res.redirect('/employee/' + employeeId + '?docError=' + encodeURIComponent(result.error))
        return
    }

    res.redirect('/employee/' + employeeId + '?docSuccess=Document uploaded successfully')
})

/**
 * Download a document.
 * Protected route - requires authentication.
 * Not served from a public static route.
 */
app.get('/documents/download/:documentId', async function (req, res) {
    let documentId = req.params.documentId
    
    let docInfo = await business.getDocumentForDownload(documentId)
    if (!docInfo) {
        res.status(404).send('Document not found')
        return
    }

    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="' + docInfo.document.originalName + '"')
    
    // Send the file
    res.sendFile(docInfo.filePath)
})

/**
 * Delete a document.
 * Protected route - requires authentication.
 */
app.post('/documents/delete/:documentId', async function (req, res) {
    let documentId = req.params.documentId
    
    // Get document to find employee ID for redirect
    let docInfo = await business.getDocumentForDownload(documentId)
    if (!docInfo) {
        res.status(404).send('Document not found')
        return
    }
    
    let employeeId = docInfo.document.employeeId
    
    let deleted = await business.deleteDocument(documentId)
    if (!deleted) {
        res.redirect('/employee/' + employeeId + '?docError=' + encodeURIComponent('Failed to delete document'))
        return
    }

    res.redirect('/employee/' + employeeId + '?docSuccess=Document deleted successfully')
})

// ============================================
// Error Handling for Multer
// ============================================
app.use(function (err, req, res, next) {
    if (err.code === 'LIMIT_FILE_SIZE') {
        // Extract employee ID from URL if present
        let match = req.originalUrl.match(/\/employee\/([^\/]+)/)
        if (match) {
            res.redirect('/employee/' + match[1] + '?docError=' + encodeURIComponent('File size must not exceed 2MB'))
            return
        }
    }
    next(err)
})

app.listen(8000, function () {
    console.log('Application started http://localhost:8000')
})
