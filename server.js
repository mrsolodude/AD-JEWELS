/* ==========================================================================
   AD JEWELS - Full-Stack Express Heritage Backend Server (Node.js)
   ========================================================================== */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;
const HOST = '127.0.0.1'; // MUST listen on localhost for secure local testing

// Simulated database directories
const DATA_DIR = path.join(__dirname, 'data');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const USERS_CSV_FILE = path.join(DATA_DIR, 'registered_users.csv');

// Ensure database folder and files exist safely
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BOOKINGS_FILE)) {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([], null, 2), 'utf-8');
}
if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2), 'utf-8');
}
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), 'utf-8');
}

// ==========================================================================
// Nodemailer Config & Safe Fallback Setup
// ==========================================================================
const nodemailer = require('nodemailer');
const EMAIL_LOGS_FILE = path.join(DATA_DIR, 'email_logs.json');

if (!fs.existsSync(EMAIL_LOGS_FILE)) {
    fs.writeFileSync(EMAIL_LOGS_FILE, JSON.stringify([], null, 2), 'utf-8');
}

// Config variables (resolving from file or process environment variables)
const EMAIL_CONFIG_FILE = path.join(DATA_DIR, 'email_config.json');
let EMAIL_USER = process.env.EMAIL_USER || 'adjewellery226@gmail.com';
let EMAIL_PASS = process.env.EMAIL_PASS || '';

if (fs.existsSync(EMAIL_CONFIG_FILE)) {
    try {
        const configData = JSON.parse(fs.readFileSync(EMAIL_CONFIG_FILE, 'utf-8'));
        if (configData.EMAIL_USER && configData.EMAIL_USER !== 'adjewellery226@gmail.com') {
            EMAIL_USER = configData.EMAIL_USER;
        }
        if (configData.EMAIL_PASS && configData.EMAIL_PASS !== 'PASTE_YOUR_16_CHARACTER_GMAIL_APP_PASSWORD_HERE') {
            EMAIL_PASS = configData.EMAIL_PASS;
        }
    } catch (err) {
        console.error('[EMAIL CONFIG ERROR] Failed to parse email_config.json:', err);
    }
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
});

/**
 * Saves fallback email log for secure local developer verification
 */
function saveFallbackEmailLog(bookingDetails, subject, status) {
    try {
        const logsData = fs.readFileSync(EMAIL_LOGS_FILE, 'utf-8');
        const logs = JSON.parse(logsData);
        logs.push({
            timestamp: new Date().toISOString(),
            status: status,
            recipient: 'adjewellery226@gmail.com',
            subject: subject,
            bookingId: bookingDetails.id,
            details: bookingDetails
        });
        fs.writeFileSync(EMAIL_LOGS_FILE, JSON.stringify(logs, null, 2), 'utf-8');
        console.log(`[EMAIL LOGGED] Fallback log generated in data/email_logs.json for booking ID: ${bookingDetails.id}`);
    } catch (e) {
        console.error('[EMAIL ERROR] Failed to write fallback email log:', e);
    }
}

/**
 * Appends a newly registered user to the CSV database (registered_users.csv)
 * so it can be viewed directly in Microsoft Excel.
 */
function appendUserToExcel(name, email, createdAt) {
    try {
        if (!fs.existsSync(USERS_CSV_FILE)) {
            const header = 'Name,Email,Registration Date\n';
            fs.writeFileSync(USERS_CSV_FILE, header, 'utf-8');
        }

        const escapeCSV = (val) => {
            if (val === null || val === undefined) return '';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        };

        const row = `${escapeCSV(name)},${escapeCSV(email)},${escapeCSV(createdAt)}\n`;
        fs.appendFileSync(USERS_CSV_FILE, row, 'utf-8');
        console.log(`[CSV UPDATED] Appended registered user ${email} to data/registered_users.csv`);
    } catch (err) {
        console.error('[CSV ERROR] Failed to append user to CSV:', err);
    }
}

/**
 * Dispatches notification email to adjewellery226@gmail.com on user registration
 */
function sendRegistrationEmail(name, email, createdAt) {
    const recipient = 'adjewellery226@gmail.com';
    const subject = `✦ AD JEWELS - New Connoisseur Registration [${email}] ✦`;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Outfit', sans-serif; background-color: #0c0a09; color: #e7e5e4; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background-color: #171515; border: 1px solid rgba(191, 149, 63, 0.2); border-radius: 8px; padding: 30px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); }
            .header { text-align: center; border-bottom: 1px solid rgba(191, 149, 63, 0.15); padding-bottom: 15px; }
            .title { color: #bf953f; font-family: 'Cinzel Decorative', serif; font-size: 1.25rem; font-weight: 700; margin: 10px 0; }
            .content { padding: 20px 0; font-size: 14px; line-height: 1.6; }
            .field-row { margin-bottom: 12px; }
            .field-label { color: #8c8a89; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; display: block; }
            .field-value { color: #fff; font-size: 14px; font-weight: 500; }
            .footer { border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 15px; text-align: center; font-size: 11px; color: #8c8a89; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="title">AD JEWELS - INNER CIRCLE</div>
                <h3 style="margin: 5px 0; color: #fff;">New Registration Alert</h3>
            </div>
            <div class="content">
                <p>Salutations, Administrator. A new patron has registered an account in the Inner Circle Sanctuary:</p>
                <div class="field-row">
                    <span class="field-label">Patron Name</span>
                    <span class="field-value">${name}</span>
                </div>
                <div class="field-row">
                    <span class="field-label">Patron Email Address</span>
                    <span class="field-value">${email}</span>
                </div>
                <div class="field-row">
                    <span class="field-label">Registration Timestamp</span>
                    <span class="field-value">${new Date(createdAt).toLocaleString()}</span>
                </div>
                <p style="font-size: 12px; color: #bf953f; font-style: italic;">
                    * This record has been automatically appended to the Sanctuary's excel sheet registry (registered_users.csv).
                </p>
            </div>
            <div class="footer">
                © 2026 AD JEWELS. Private Vault Notification System.
            </div>
        </div>
    </body>
    </html>
    `;

    let activeUser = process.env.EMAIL_USER || 'adjewellery226@gmail.com';
    let activePass = process.env.EMAIL_PASS || '';

    if (fs.existsSync(EMAIL_CONFIG_FILE)) {
        try {
            const configData = JSON.parse(fs.readFileSync(EMAIL_CONFIG_FILE, 'utf-8'));
            if (configData.EMAIL_USER && configData.EMAIL_USER !== 'adjewellery226@gmail.com') {
                activeUser = configData.EMAIL_USER;
            }
            if (configData.EMAIL_PASS && configData.EMAIL_PASS !== 'PASTE_YOUR_16_CHARACTER_GMAIL_APP_PASSWORD_HERE') {
                activePass = configData.EMAIL_PASS;
            }
        } catch (err) {
            console.error('[EMAIL CONFIG ERROR] Failed to parse email_config.json on-demand:', err);
        }
    }

    const transport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: activeUser,
            pass: activePass
        }
    });

    const mailOptions = {
        from: `"AD JEWELS Sanctuary" <${activeUser}>`,
        to: recipient,
        subject: subject,
        html: htmlContent
    };

    transport.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('[EMAIL ERROR] Failed to dispatch registration alert:', error);
            saveFallbackEmailLog({ id: email, name: name, email: email, source: 'Registration Alert' }, subject, 'Registration Email Error: ' + error.message);
        } else {
            console.log(`[EMAIL DISPATCHED] Registration alert sent to ${recipient}: ${info.response}`);
            saveFallbackEmailLog({ id: email, name: name, email: email, source: 'Registration Alert' }, subject, 'Sent successfully');
        }
    });
}

/**
 * Dispatches beautiful, Chola/Pandya golden-themed HTML email to adjewellery226@gmail.com
 */
function sendBookingEmail(bookingDetails) {
    const recipient = 'adjewellery226@gmail.com';
    const formType = bookingDetails.source || 'Bespoke Creation & Consultation Inquiry';
    const subject = `✦ AD JEWELS - New ${formType} Request [${bookingDetails.id}] ✦`;

    // Dynamic config reload on demand!
    let activeUser = process.env.EMAIL_USER || 'adjewellery226@gmail.com';
    let activePass = process.env.EMAIL_PASS || '';

    if (fs.existsSync(EMAIL_CONFIG_FILE)) {
        try {
            const configData = JSON.parse(fs.readFileSync(EMAIL_CONFIG_FILE, 'utf-8'));
            if (configData.EMAIL_USER && configData.EMAIL_USER !== 'adjewellery226@gmail.com') {
                activeUser = configData.EMAIL_USER;
            }
            if (configData.EMAIL_PASS && configData.EMAIL_PASS !== 'PASTE_YOUR_16_CHARACTER_GMAIL_APP_PASSWORD_HERE') {
                activePass = configData.EMAIL_PASS;
            }
        } catch (err) {
            console.error('[EMAIL CONFIG ERROR] Failed to parse email_config.json on-demand:', err);
        }
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {
                font-family: 'Outfit', 'Helvetica Neue', Helvetica, Arial, sans-serif;
                background-color: #0c0a09;
                color: #e7e5e4;
                margin: 0;
                padding: 0;
                -webkit-font-smoothing: antialiased;
            }
            .wrapper {
                background-color: #0c0a09;
                padding: 40px 20px;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #171515;
                border: 1px solid rgba(191, 149, 63, 0.2);
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            }
            .header {
                background: linear-gradient(135deg, #171515, #0c0a09);
                padding: 30px;
                text-align: center;
                border-bottom: 1px solid rgba(191, 149, 63, 0.15);
            }
            .logo-text {
                font-family: 'Cinzel', serif;
                font-size: 24px;
                color: #bf953f;
                letter-spacing: 0.1em;
                margin: 0;
                text-transform: uppercase;
                font-weight: bold;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
            }
            .logo-sub {
                font-size: 10px;
                color: #a8a29e;
                letter-spacing: 0.2em;
                text-transform: uppercase;
                margin-top: 5px;
            }
            .content {
                padding: 40px 30px;
            }
            .title-badge {
                display: inline-block;
                background-color: rgba(191, 149, 63, 0.1);
                border: 1px solid #bf953f;
                color: #bf953f;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                padding: 6px 12px;
                border-radius: 20px;
                margin-bottom: 25px;
                font-weight: 600;
            }
            .headline {
                font-size: 20px;
                color: #f5f5f4;
                margin: 0 0 10px 0;
                font-weight: 500;
                line-height: 1.4;
            }
            .ref-code {
                font-size: 14px;
                color: #a8a29e;
                margin-bottom: 30px;
            }
            .ref-code strong {
                color: #bf953f;
            }
            .details-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
            }
            .details-table th, .details-table td {
                padding: 14px 10px;
                text-align: left;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }
            .details-table th {
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: #a8a29e;
                width: 30%;
                font-weight: 600;
            }
            .details-table td {
                font-size: 14px;
                color: #e7e5e4;
                font-weight: 300;
            }
            .notes-box {
                background-color: rgba(255, 255, 255, 0.02);
                border: 1px dashed rgba(191, 149, 63, 0.25);
                border-radius: 6px;
                padding: 20px;
                margin-top: 10px;
            }
            .notes-title {
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: #bf953f;
                margin-bottom: 8px;
                font-weight: 600;
            }
            .notes-text {
                font-size: 14px;
                color: #d6d3d1;
                line-height: 1.6;
                margin: 0;
                white-space: pre-wrap;
            }
            .footer {
                background-color: #0c0a09;
                padding: 25px 30px;
                text-align: center;
                border-top: 1px solid rgba(191, 149, 63, 0.15);
            }
            .footer-text {
                font-size: 11px;
                color: #78716c;
                line-height: 1.5;
                margin: 0;
            }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="container">
                <div class="header">
                    <div class="logo-text">AD JEWELS</div>
                    <div class="logo-sub">Heritage Temple Craftsmanship</div>
                </div>
                <div class="content">
                    <span class="title-badge">${formType}</span>
                    <h2 class="headline">New Luxury Inquiry Received</h2>
                    <div class="ref-code">Reference Code: <strong>${bookingDetails.id}</strong></div>
                    
                    <table class="details-table">
                        <tr>
                            <th>Patron Name</th>
                            <td>${bookingDetails.name}</td>
                        </tr>
                        <tr>
                            <th>Email Address</th>
                            <td><a href="mailto:${bookingDetails.email}" style="color: #bf953f; text-decoration: none;">${bookingDetails.email}</a></td>
                        </tr>
                        <tr>
                            <th>Phone Number</th>
                            <td><a href="tel:${bookingDetails.phone}" style="color: #bf953f; text-decoration: none;">${bookingDetails.phone}</a></td>
                        </tr>
                        <tr>
                            <th>Preferred Date</th>
                            <td>${bookingDetails.date}</td>
                        </tr>
                        ${bookingDetails.time ? `
                        <tr>
                            <th>Preferred Time</th>
                            <td>${bookingDetails.time}</td>
                        </tr>
                        ` : ''}
                        <tr>
                            <th>Collection</th>
                            <td style="text-transform: capitalize; font-weight: bold; color: #bf953f;">${bookingDetails.design}</td>
                        </tr>
                        ${bookingDetails.ideaFile ? `
                        <tr>
                            <th>Design Idea File</th>
                            <td style="color: #bf953f; font-weight: bold;">✦ ${bookingDetails.ideaFile.originalName} (Attached)</td>
                        </tr>
                        ` : ''}
                    </table>

                    ${bookingDetails.notes ? `
                    <div class="notes-box">
                        <div class="notes-title">Bespoke Request & Special Instructions</div>
                        <p class="notes-text">${bookingDetails.notes}</p>
                    </div>
                    ` : ''}
                </div>
                <div class="footer">
                    <p class="footer-text">© 2026 AD JEWELS Heritage Ltd. All rights reserved.</p>
                    <p class="footer-text" style="margin-top: 5px;">Kanniyakumari District, Tamil Nadu, India.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    if (activePass) {
        const mailOptions = {
            from: `"AD JEWELS Concierge" <${activeUser}>`,
            to: recipient,
            replyTo: bookingDetails.email, // Let replies go directly to the client's email address!
            subject: subject,
            html: htmlContent
        };
        if (bookingDetails.ideaFile && bookingDetails.ideaFile.savedPath) {
            mailOptions.attachments = [{
                filename: bookingDetails.ideaFile.originalName,
                path: bookingDetails.ideaFile.savedPath
            }];
        }
        const activeTransporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: activeUser,
                pass: activePass
            }
        });
        activeTransporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('[EMAIL ERROR] Failed to send live notification:', error);
                saveFallbackEmailLog(bookingDetails, subject, 'FAILED_SEND: ' + error.message);
            } else {
                console.log('[EMAIL SUCCESS] Live email notification dispatched:', info.response);
            }
        });
    } else {
        console.warn('[EMAIL WARNING] SMTP credentials not fully configured (EMAIL_PASS is missing). Saving fallback email log.');
        saveFallbackEmailLog(bookingDetails, subject, 'PENDING_CONFIG');
    }
}

// 1. Parse JSON body payloads safely
app.use(express.json({ limit: '15mb' })); // Increased limit to support customer sketch file uploads, while preventing excessive payloads

// 2. Inject Robust HTTP Security Headers
app.use((req, res, next) => {
    // Enable CORS for secure local development and testing
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    // Prevent MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Mitigate Clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    // Enforce strict Content-Security-Policy (CSP)
    // Allows scripts only from self, cdnjs, and jsdelivr for Three.js
    // Allows style and font sheets strictly from Google Fonts
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data:; " +
        "connect-src 'self' http://localhost:8000 http://127.0.0.1:8000;"
    );
    
    next();
});

// 3. Disable caching for JS and HTML so browser always gets the latest version
app.use((req, res, next) => {
    if (req.url.endsWith('.js') || req.url.endsWith('.html') || req.url === '/') {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
    }
    next();
});

// 4. Serve Frontend Static Assets
app.use(express.static(__dirname));

/* ==========================================================================
   REST API Endpoint: Consultation Bookings (POST /api/bookings)
   ========================================================================== */
app.post('/api/bookings', (req, res) => {
    try {
        const { name, email, phone, date, time, design, notes, source, ideaFile, ideaFileName } = req.body;

        // --- Server-side Input Validation & Sanitization ---
        if (!name || !email || !phone || !date || !design) {
            return res.status(400).json({ error: 'All primary fields are required.' });
        }

        // Validate and save custom design idea file if uploaded
        let savedFileInfo = null;
        if (ideaFile && ideaFileName) {
            // Path traversal protection: strip directories
            const cleanFileName = path.basename(ideaFileName);
            const ext = path.extname(cleanFileName).toLowerCase();
            const allowedExts = ['.png', '.jpg', '.jpeg', '.webp', '.pdf'];
            
            if (!allowedExts.includes(ext)) {
                return res.status(400).json({ error: 'File type not allowed. Please upload PNG, JPG, WEBP, or PDF.' });
            }

            // Impose size limit on uploaded file data (10MB maximum decoded size)
            const estimatedBytes = ideaFile.length * 0.75;
            if (estimatedBytes > 10 * 1024 * 1024) {
                return res.status(400).json({ error: 'Uploaded file size exceeds the 10MB backend limit.' });
            }

            // Generate an unpredictable unique name to prevent target path attacks or collisions
            const crypto = require('crypto');
            const uniqueName = crypto.randomBytes(16).toString('hex') + ext;

            const uploadDir = path.join(__dirname, 'data', 'uploads');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const savedFilePath = path.join(uploadDir, uniqueName);
            const fileBuffer = Buffer.from(ideaFile, 'base64');
            fs.writeFileSync(savedFilePath, fileBuffer);

            savedFileInfo = {
                originalName: cleanFileName,
                savedName: uniqueName,
                savedPath: savedFilePath
            };
        }

        // Strip HTML characters to prevent storage-based XSS injection
        const cleanName = name.replace(/[<>]/g, '').trim();
        const cleanEmail = email.replace(/[<>]/g, '').trim();
        const cleanPhone = phone.replace(/[^\d+-\s]/g, '').trim(); // Strip non-phone symbols
        const cleanNotes = notes ? notes.replace(/[<>]/g, '').trim() : '';
        const cleanSource = source ? source.replace(/[<>]/g, '').trim() : 'Bespoke Creation & Consultation Inquiry';
        const cleanTime = time ? time.replace(/[<>]/g, '').trim() : '';

        // Enforce strict regex formats
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            return res.status(400).json({ error: 'Invalid email address format.' });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' });
        }

        const allowedDesigns = ['jimikki', 'kasumalai', 'vanki', 'mangamalai', 'oddiyanam', 'nethichutti', 'bridalset', 'valayal', 'kaapu', 'ring', 'chain', 'rutraksha', 'thusi', 'Stud', 'Kolusu', 'Bracelet'];
        if (!allowedDesigns.includes(design)) {
            return res.status(400).json({ error: 'Invalid collection selected.' });
        }

        // Read existing bookings to prevent collisions and determine sequential suffix
        const bookingsData = fs.readFileSync(BOOKINGS_FILE, 'utf-8');
        const bookings = JSON.parse(bookingsData);

        // Generate a guaranteed unique and dynamic booking reference code for each registration
        let refCode;
        let isDuplicate = true;
        while (isDuplicate) {
            const randomId = Math.floor(1000 + Math.random() * 9000);
            const nextSeq = bookings.length + 1;
            refCode = `AD-${randomId}-${nextSeq}-26`;
            isDuplicate = bookings.some(b => b.id === refCode);
        }

        const newBooking = {
            id: refCode,
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            date: date,
            time: cleanTime,
            design: design,
            notes: cleanNotes,
            source: cleanSource,
            ideaFile: savedFileInfo ? {
                originalName: savedFileInfo.originalName,
                savedName: savedFileInfo.savedName,
                savedPath: savedFileInfo.savedPath
            } : null,
            createdAt: new Date().toISOString()
        };

        bookings.push(newBooking);
        fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf-8');

        // Dispatches beautifully styled notification email to adjewellery226@gmail.com
        sendBookingEmail(newBooking);

        // Return full details to client (unmasked)
        const maskedName = cleanName;
        const maskedEmail = cleanEmail;

        res.status(201).json({
            success: true,
            refCode: refCode,
            clientName: maskedName,
            clientEmail: maskedEmail
        });

    } catch (e) {
        // Safe error logging: generic message to user, details locally
        console.error('Error processing booking consultation:', e);
        res.status(500).json({ error: 'Internal Server Error. Please try again later.' });
    }
});

/* ==========================================================================
   REST API Endpoint: Consultation Bookings Lookup (POST /api/bookings/lookup)
   ========================================================================== */
app.post('/api/bookings/lookup', (req, res) => {
    try {
        const { email, refCode } = req.body;

        if (!email || !refCode) {
            return res.status(400).json({ error: 'Both email and reference code are required.' });
        }

        const cleanEmail = email.replace(/[<>]/g, '').trim().toLowerCase();
        const cleanRefCode = refCode.replace(/[<>]/g, '').trim().toUpperCase();

        // Read atomically from bookings.json
        const bookingsData = fs.readFileSync(BOOKINGS_FILE, 'utf-8');
        const bookings = JSON.parse(bookingsData);

        // Find match
        const match = bookings.find(b => 
            b.email.toLowerCase() === cleanEmail && 
            b.id.toUpperCase() === cleanRefCode
        );

        if (!match) {
            return res.status(404).json({ error: 'No active Imperial Invitation found under these credentials.' });
        }

        // Return details
        res.status(200).json({
            success: true,
            booking: {
                id: match.id,
                name: match.name,
                email: match.email,
                phone: match.phone,
                date: match.date,
                time: match.time || '',
                design: match.design,
                notes: match.notes,
                createdAt: match.createdAt
            }
        });

    } catch (e) {
        console.error('Error looking up booking:', e);
        res.status(500).json({ error: 'Internal Server Error. Please try again later.' });
    }
});

/* ==========================================================================
   REST API Endpoints: Email Logs & Details Routing Setup
   ========================================================================== */
app.get('/api/email-logs', (req, res) => {
    try {
        const logsData = fs.readFileSync(EMAIL_LOGS_FILE, 'utf-8');
        res.status(200).json(JSON.parse(logsData));
    } catch (e) {
        console.error('Error reading email logs:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/email-logs/:bookingId', (req, res) => {
    try {
        const { bookingId } = req.params;
        const logsData = fs.readFileSync(EMAIL_LOGS_FILE, 'utf-8');
        const logs = JSON.parse(logsData);
        const match = logs.find(l => 
            l.bookingId === bookingId || 
            l.bookingId === bookingId.toUpperCase() ||
            (l.details && l.details.id === bookingId)
        );
        if (!match) {
            return res.status(404).json({ error: 'Email log not found for this booking ID' });
        }
        res.status(200).json(match);
    } catch (e) {
        console.error('Error reading email log:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/email-details/:bookingId', (req, res) => {
    try {
        const { bookingId } = req.params;
        const logsData = fs.readFileSync(EMAIL_LOGS_FILE, 'utf-8');
        const logs = JSON.parse(logsData);
        const match = logs.find(l => 
            l.bookingId === bookingId || 
            l.bookingId === bookingId.toUpperCase() ||
            (l.details && l.details.id === bookingId)
        );
        if (!match) {
            return res.status(404).json({ error: 'Email details not found for this booking ID' });
        }
        res.status(200).json(match);
    } catch (e) {
        console.error('Error reading email details:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/email/details/:bookingId', (req, res) => {
    try {
        const { bookingId } = req.params;
        const logsData = fs.readFileSync(EMAIL_LOGS_FILE, 'utf-8');
        const logs = JSON.parse(logsData);
        const match = logs.find(l => 
            l.bookingId === bookingId || 
            l.bookingId === bookingId.toUpperCase() ||
            (l.details && l.details.id === bookingId)
        );
        if (!match) {
            return res.status(404).json({ error: 'Email details not found for this booking ID' });
        }
        res.status(200).json(match);
    } catch (e) {
        console.error('Error reading email details:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* ==========================================================================
   REST API Endpoints: Administrative Dashboard Support
   ========================================================================== */

// GET /api/bookings (Admin - lists all bookings)
app.get('/api/bookings', (req, res) => {
    try {
        const bookingsData = fs.readFileSync(BOOKINGS_FILE, 'utf-8');
        res.status(200).json(JSON.parse(bookingsData));
    } catch (e) {
        console.error('Error reading bookings:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/orders (Admin - lists all orders)
app.get('/api/orders', (req, res) => {
    try {
        const ordersData = fs.readFileSync(ORDERS_FILE, 'utf-8');
        res.status(200).json(JSON.parse(ordersData));
    } catch (e) {
        console.error('Error reading orders:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/email-config (Admin - reads current email config without pass)
app.get('/api/email-config', (req, res) => {
    try {
        let activeUser = 'adjewellery226@gmail.com';
        if (fs.existsSync(EMAIL_CONFIG_FILE)) {
            const configData = JSON.parse(fs.readFileSync(EMAIL_CONFIG_FILE, 'utf-8'));
            if (configData.EMAIL_USER) activeUser = configData.EMAIL_USER;
        }
        res.status(200).json({ EMAIL_USER: activeUser });
    } catch (e) {
        console.error('Error reading email config:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/email-config (Admin - updates email settings)
app.post('/api/email-config', (req, res) => {
    try {
        const { EMAIL_USER, EMAIL_PASS } = req.body;
        if (!EMAIL_USER || !EMAIL_PASS) {
            return res.status(400).json({ error: 'Email user and password are required.' });
        }
        const configData = { EMAIL_USER, EMAIL_PASS };
        fs.writeFileSync(EMAIL_CONFIG_FILE, JSON.stringify(configData, null, 2), 'utf-8');
        res.status(200).json({ success: true, message: 'Configuration saved successfully.' });
    } catch (e) {
        console.error('Error saving email config:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/* ==========================================================================
   REST API Endpoint: Inner Circle User Registration (POST /api/auth/register)
   ========================================================================== */
app.post('/api/auth/register', (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        const cleanName = name.replace(/[<>]/g, '').trim();
        const cleanEmail = email.replace(/[<>]/g, '').trim().toLowerCase();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            return res.status(400).json({ error: 'Invalid email format.' });
        }

        const usersData = fs.readFileSync(USERS_FILE, 'utf-8');
        const users = JSON.parse(usersData);

        // Check if user already exists
        if (users.some(u => u.email === cleanEmail)) {
            return res.status(400).json({ error: 'An account is already registered under this email.' });
        }

        const newUser = {
            name: cleanName,
            email: cleanEmail,
            password: password, // In production, bcrypt hash is mandatory
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');

        // Automatic Excel/CSV Registry Entry and Admin Email Notification
        appendUserToExcel(cleanName, cleanEmail, newUser.createdAt);
        sendRegistrationEmail(cleanName, cleanEmail, newUser.createdAt);

        res.status(201).json({
            success: true,
            message: 'Registered successfully.',
            user: {
                name: cleanName,
                email: cleanEmail
            }
        });

    } catch (e) {
        console.error('Error during registration:', e);
        res.status(500).json({ error: 'Internal Server Error.' });
    }
});

/* ==========================================================================
   REST API Endpoint: Inner Circle Login (POST /api/auth/login)
   ========================================================================== */
app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const cleanEmail = email.trim().toLowerCase();

        const usersData = fs.readFileSync(USERS_FILE, 'utf-8');
        const users = JSON.parse(usersData);

        const user = users.find(u => u.email === cleanEmail && u.password === password);

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        res.status(200).json({
            success: true,
            user: {
                name: user.name,
                email: user.email
            }
        });

    } catch (e) {
        console.error('Error during login:', e);
        res.status(500).json({ error: 'Internal Server Error.' });
    }
});

/* ==========================================================================
   REST API Endpoint: Masterpiece Orders (POST /api/orders)
   ========================================================================== */
app.post('/api/orders', (req, res) => {
    try {
        const { product, metal, gemstone, engraving, price } = req.body;

        // --- Server-side Input Validation ---
        if (!product || !metal || !gemstone || price === undefined) {
            return res.status(400).json({ error: 'Missing core customization attributes.' });
        }

        // Allow-list checks
        const allowedProducts = ['jimikki', 'kasumalai', 'vanki', 'mangamalai', 'oddiyanam', 'nethichutti', 'bridalset', 'valayal', 'kaapu', 'ring', 'chain', 'rutraksha', 'thusi', 'Stud', 'Kolusu', 'Bracelet'];
        const allowedMetals = ['antique', 'yellow', 'rose', 'platinum'];
        const allowedGems = ['ruby', 'emerald', 'diamond', 'sapphire'];

        if (!allowedProducts.includes(product) || !allowedMetals.includes(metal) || !allowedGems.includes(gemstone)) {
            return res.status(400).json({ error: 'Invalid customizer selections.' });
        }

        const cleanEngraving = engraving ? engraving.replace(/[^a-zA-Z0-9\s\u0B80-\u0BFF]/g, '').slice(0, 12).trim() : '';

        // Generate secure invoice reference code
        const randomId = Math.floor(100000 + Math.random() * 900000);
        const invoiceCode = `INV-${randomId}-26`;

        const ordersData = fs.readFileSync(ORDERS_FILE, 'utf-8');
        const orders = JSON.parse(ordersData);

        const newOrder = {
            invoiceId: invoiceCode,
            product: product,
            metal: metal,
            gemstone: gemstone,
            engraving: cleanEngraving,
            price: price,
            createdAt: new Date().toISOString()
        };

        orders.push(newOrder);
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');

        res.status(201).json({
            success: true,
            invoiceId: invoiceCode,
            estInvestment: price
        });

    } catch (e) {
        console.error('Error acquiring custom masterpiece:', e);
        res.status(500).json({ error: 'Internal Server Error. Please try again later.' });
    }
});

// Generic 404 Route handler
app.use((req, res) => {
    res.status(404).send('Heritage Sanctuary page not found.');
});

// Start Express Server
app.listen(PORT, HOST, () => {
    console.log(`================================================================`);
    console.log(`  AD JEWELS Full-Stack Express Server started successfully!`);
    console.log(`  Sanctuary URL: http://${HOST}:${PORT}`);
    console.log(`================================================================`);
});
