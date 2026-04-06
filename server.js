require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const FormData = require('form-data');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });
const dbFile = path.join(__dirname, 'database.json');

// Initialize database
async function getDb() {
    try {
        const data = await fs.readFile(dbFile, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return {
            tickets: [],
            admins: [],
            SUPER_ADMIN: { 
                email: process.env.SUPER_ADMIN_EMAIL || 'it@royalorchidhotels.com', 
                password: process.env.SUPER_ADMIN_PASSWORD || 'default123', 
                name: 'Super Admin', 
                role: 'superadmin' 
            }
        };
    }
}
async function saveDb(data) {
    await fs.writeFile(dbFile, JSON.stringify(data, null, 2));
}

// Zoho WorkDrive Upload Function
async function uploadToZoho(filePath, originalName) {
    try {
        const domain = process.env.ZOHO_DOMAIN || 'in';

        // 1. Get Access Token
        console.log("Fetching Zoho Access Token...");
        const tokenRes = await axios.post(`https://accounts.zoho.${domain}/oauth/v2/token`, null, {
            params: {
                refresh_token: process.env.ZOHO_REFRESH_TOKEN,
                client_id: process.env.ZOHO_CLIENT_ID,
                client_secret: process.env.ZOHO_CLIENT_SECRET,
                grant_type: 'refresh_token'
            }
        });
        const accessToken = tokenRes.data.access_token;
        if (!accessToken) throw new Error('Failed to get Zoho Access Token');

        // 2. Upload File to WorkDrive
        console.log("Uploading file to WorkDrive folder...");
        const formData = new FormData();
        formData.append('content', require('fs').createReadStream(filePath));
        formData.append('filename', originalName);
        formData.append('parent_id', process.env.ZOHO_FOLDER_ID);
        formData.append('override-name-exist', 'true');

        const uploadRes = await axios.post(`https://www.zohoapis.${domain}/workdrive/api/v1/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Zoho-oauthtoken ${accessToken}`
            }
        });

        // 3. Delete local temp file
        await fs.unlink(filePath).catch(() => { });

        console.log("Upload Success!");
        return uploadRes.data.data[0].attributes.Permalink;
    } catch (err) {
        console.error('Zoho Upload Error:', err.response ? err.response.data : err.message);
        return null;
    }
}

// Routes
app.post('/api/login', async (req, res) => {
    const { email, pass } = req.body;
    const db = await getDb();
    if (email === db.SUPER_ADMIN.email.toLowerCase() && pass === db.SUPER_ADMIN.password) {
        return res.json({ user: db.SUPER_ADMIN });
    }
    const found = db.admins.find(a => a.email.toLowerCase() === email && a.password === pass);
    if (found) {
        return res.json({ user: { ...found, role: 'hoteladmin' } });
    }
    res.status(401).json({ error: 'Invalid email or password' });
});

app.get('/api/tickets', async (req, res) => {
    const db = await getDb();
    res.json(db.tickets);
});

app.post('/api/tickets', upload.single('file'), async (req, res) => {
    const ticket = JSON.parse(req.body.ticketData);

    // Process WorkDrive attachment if Zoho keys are set
    if (req.file && process.env.ZOHO_REFRESH_TOKEN) {
        const permalink = await uploadToZoho(req.file.path, req.file.originalname);
        if (permalink) ticket.attachmentLink = permalink;
    } else if (req.file) {
        // Cleanup file if Zoho not configured
        await fs.unlink(req.file.path).catch(() => { });
    }

    const db = await getDb();
    db.tickets.unshift(ticket);
    await saveDb(db);
    res.json({ success: true, ticket });
});

app.patch('/api/tickets/:id', async (req, res) => {
    const db = await getDb();
    const idx = db.tickets.findIndex(t => t.id === req.params.id);
    if (idx !== -1) {
        db.tickets[idx].status = req.body.status;
        if (req.body.note) {
            db.tickets[idx].notes = db.tickets[idx].notes || [];
            db.tickets[idx].notes.push(req.body.note);
        }
        await saveDb(db);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

app.get('/api/admins', async (req, res) => {
    const db = await getDb();
    res.json(db.admins);
});

app.post('/api/admins', async (req, res) => {
    const db = await getDb();
    if (db.admins.find(a => a.email.toLowerCase() === req.body.email.toLowerCase())) {
        return res.status(400).json({ error: 'Email exists' });
    }
    db.admins.push(req.body);
    await saveDb(db);
    res.json({ success: true });
});

app.delete('/api/admins/:idx', async (req, res) => {
    const db = await getDb();
    db.admins.splice(req.params.idx, 1);
    await saveDb(db);
    res.json({ success: true });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Backend API Server running at http://localhost:${port}`);
    console.log('Ensure Zoho keys are set in the .env file for WorkDrive integration.');
});
