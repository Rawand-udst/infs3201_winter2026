const mongodb = require('mongodb')
const { MongoClient, ObjectId } = mongodb

let client = undefined

const dns = require('dns')
dns.setServers(['8.8.8.8', '8.8.4.4'])

async function connectDatabase() {
    if (!client) {
        client = new MongoClient("mongodb+srv://Rawand_60304948:12class34@cluster0.0ztz6je.mongodb.net/")
        await client.connect()
    }
}

function getDb() {
    return client.db('infs3201_winter2026')
}

/**
 * Step 1: add empty employees array to every shift
 * @returns {Promise<void>}
 */
async function addEmptyEmployeesArray() {
    let db = getDb()
    let shifts = db.collection('shifts')
    await shifts.updateMany(
        {},
        { $set: { employees: [] } }
    )
    console.log('Step 1 done: empty employees arrays added')
}

/**
 * Step 2: move employee ObjectIds into shifts.employees
 * @returns {Promise<void>}
 */
async function embedEmployeesIntoShifts() {
    let db = getDb()
    let employees = db.collection('employees')
    let shifts = db.collection('shifts')
    let assignments = db.collection('assignments')

    let allAssignments = await assignments.find().toArray()

    for (let i = 0; i < allAssignments.length; i++) {
        let assignment = allAssignments[i]

        let employee = await employees.findOne({ employeeId: assignment.employeeId })
        let shift = await shifts.findOne({ shiftId: assignment.shiftId })

        if (employee !== null && shift !== null) {
            await shifts.updateOne(
                { _id: shift._id },
                { $addToSet: { employees: employee._id } }
            )
        }
    }

    console.log('Step 2 done: employees embedded into shifts')
}

/**
 * Step 3: remove old relational-style fields/collection
 * @returns {Promise<void>}
 */
async function removeOldFieldsAndCollection() {
    let db = getDb()

    await db.collection('employees').updateMany(
        {},
        { $unset: { employeeId: "" } }
    )

    await db.collection('shifts').updateMany(
        {},
        { $unset: { shiftId: "" } }
    )

    await db.collection('assignments').drop().catch(function () {
        console.log('assignments collection already removed')
    })

    console.log('Step 3 done: old fields removed and assignments dropped')
}

async function main() {
    await connectDatabase()
    await addEmptyEmployeesArray()
    await embedEmployeesIntoShifts()
    await removeOldFieldsAndCollection()
    console.log('Transformation complete')
    process.exit(0)
}

main().catch(function (err) {
    console.error(err)
    process.exit(1)
})