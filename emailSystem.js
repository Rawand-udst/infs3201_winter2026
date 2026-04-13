/**
 * Email System Module
 * This module provides email functionality for the scheduling system.
 * The implementation uses console.log() for demonstration purposes,
 * but the interface is designed to be easily swapped with a real email provider.
 * @module emailSystem
 */

/**
 * Sends a 2FA verification code to the user's email.
 * @param {string} toEmail - The recipient's email address
 * @param {string} username - The username for personalization
 * @param {string} code - The 6-digit verification code
 * @returns {Promise<boolean>} - Returns true if email was sent successfully
 */
async function send2FACode(toEmail, username, code) {
    console.log('========================================')
    console.log('EMAIL SENT - 2FA Verification Code')
    console.log('========================================')
    console.log('To: ' + toEmail)
    console.log('Subject: Your 2FA Verification Code')
    console.log('----------------------------------------')
    console.log('Hello ' + username + ',')
    console.log('')
    console.log('Your verification code is: ' + code)
    console.log('')
    console.log('This code will expire in 3 minutes.')
    console.log('')
    console.log('If you did not request this code, please ignore this email.')
    console.log('========================================')
    return true
}

/**
 * Sends a suspicious activity warning email to the user.
 * @param {string} toEmail - The recipient's email address
 * @param {string} username - The username for personalization
 * @param {number} failedAttempts - Number of failed login attempts
 * @returns {Promise<boolean>} - Returns true if email was sent successfully
 */
async function sendSuspiciousActivityWarning(toEmail, username, failedAttempts) {
    console.log('========================================')
    console.log('EMAIL SENT - Suspicious Activity Warning')
    console.log('========================================')
    console.log('To: ' + toEmail)
    console.log('Subject: Suspicious Activity Detected on Your Account')
    console.log('----------------------------------------')
    console.log('Hello ' + username + ',')
    console.log('')
    console.log('We detected suspicious activity on your account.')
    console.log('There have been ' + failedAttempts + ' failed login attempts.')
    console.log('')
    console.log('If this was you, please ensure you are entering the correct credentials.')
    console.log('If this was not you, we recommend changing your password immediately.')
    console.log('')
    console.log('After 10 failed attempts, your account will be locked.')
    console.log('========================================')
    return true
}

/**
 * Sends an account locked notification email to the user.
 * @param {string} toEmail - The recipient's email address
 * @param {string} username - The username for personalization
 * @returns {Promise<boolean>} - Returns true if email was sent successfully
 */
async function sendAccountLockedNotification(toEmail, username) {
    console.log('========================================')
    console.log('EMAIL SENT - Account Locked')
    console.log('========================================')
    console.log('To: ' + toEmail)
    console.log('Subject: Your Account Has Been Locked')
    console.log('----------------------------------------')
    console.log('Hello ' + username + ',')
    console.log('')
    console.log('Your account has been locked due to 10 failed login attempts.')
    console.log('')
    console.log('Please contact the administrator to unlock your account.')
    console.log('========================================')
    return true
}

/**
 * Sends a generic email.
 * @param {string} toEmail - The recipient's email address
 * @param {string} subject - The email subject
 * @param {string} body - The email body text
 * @returns {Promise<boolean>} - Returns true if email was sent successfully
 */
async function sendEmail(toEmail, subject, body) {
    console.log('========================================')
    console.log('EMAIL SENT')
    console.log('========================================')
    console.log('To: ' + toEmail)
    console.log('Subject: ' + subject)
    console.log('----------------------------------------')
    console.log(body)
    console.log('========================================')
    return true
}

module.exports = {
    send2FACode,
    sendSuspiciousActivityWarning,
    sendAccountLockedNotification,
    sendEmail
}
