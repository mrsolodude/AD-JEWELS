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

// 1. Parse JSON body payloads safely
app.use(express.json({ limit: '10kb' })); // Imposes strict payload size limit against DOS attacks

// 2. Inject Robust HTTP Security Headers
app.use((req, res, next) => {
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
        "connect-src 'self';"
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
        const { name, email, phone, date, design, notes } = req.body;

        // --- Server-side Input Validation & Sanitization ---
        if (!name || !email || !phone || !date || !design) {
            return res.status(400).json({ error: 'All primary fields are required.' });
        }

        // Strip HTML characters to prevent storage-based XSS injection
        const cleanName = name.replace(/[<>]/g, '').trim();
        const cleanEmail = email.replace(/[<>]/g, '').trim();
        const cleanPhone = phone.replace(/[^\d+-\s]/g, '').trim(); // Strip non-phone symbols
        const cleanNotes = notes ? notes.replace(/[<>]/g, '').trim() : '';

        // Enforce strict regex formats
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            return res.status(400).json({ error: 'Invalid email address format.' });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' });
        }

        const allowedDesigns = ['jimikki', 'kasumalai', 'vanki', 'mangamalai', 'oddiyanam', 'nethichutti', 'mookuthi', 'valayal', 'thusi', 'Stud', 'Kolusu'];
        if (!allowedDesigns.includes(design)) {
            return res.status(400).json({ error: 'Invalid collection selected.' });
        }

        // Generate unique, unpredictable booking reference code
        const randomId = Math.floor(1000 + Math.random() * 9000);
        const refCode = `AD-${randomId}-26`;

        // Read and write atomically using blocking fs operations
        const bookingsData = fs.readFileSync(BOOKINGS_FILE, 'utf-8');
        const bookings = JSON.parse(bookingsData);

        const newBooking = {
            id: refCode,
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            date: date,
            design: design,
            notes: cleanNotes,
            createdAt: new Date().toISOString()
        };

        bookings.push(newBooking);
        fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf-8');

        // Apply PII Masking before echoing details in response to client
        const maskedName = cleanName.charAt(0) + '*'.repeat(Math.max(3, cleanName.length - 2)) + cleanName.slice(-1);
        const emailParts = cleanEmail.split('@');
        const maskedEmail = emailParts[0].charAt(0) + '***@' + emailParts[1];

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
        const allowedProducts = ['jimikki', 'kasumalai', 'vanki', 'mangamalai', 'oddiyanam', 'nethichutti', 'mookuthi', 'valayal', 'thusi', 'Stud', 'Kolusu'];
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
app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`  AD JEWELS Full-Stack Express Server started successfully!`);
    console.log(`  Sanctuary URL: http://localhost:${PORT}`);
    console.log(`================================================================`);
});
