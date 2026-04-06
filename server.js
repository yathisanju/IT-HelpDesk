const catalyst = require('zcatalyst-sdk-node');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// Middleware to initialize Catalyst
app.use((req, res, next) => {
    const catalystApp = catalyst.initialize(req);
    res.locals.catalyst = catalystApp;
    next();
});

// Helper for Data Store
const TABLE_TICKETS = 'Tickets';
const TABLE_ADMINS = 'Admins';
const FOLDER_ATTACHMENTS = 'TicketAttachments';

// Routes
app.post('/api/login', async (req, res) => {
    const { email, pass } = req.body;
    const catalystApp = res.locals.catalyst;

    try {
        // 1. Check Super Admin from .env (optional backup)
        const superEmail = process.env.SUPER_ADMIN_EMAIL || 'it@royalorchidhotels.com';
        const superPass = process.env.SUPER_ADMIN_PASSWORD || 'Regenta@2026';

        if (email.toLowerCase() === superEmail.toLowerCase() && pass === superPass) {
            return res.json({ user: { email: superEmail, name: 'Super Admin', role: 'superadmin' } });
        }

        // 2. Check Data Store for Admins
        const zcq = catalystApp.zcql();
        const query = `SELECT * FROM ${TABLE_ADMINS} WHERE email = '${email.toLowerCase()}' AND password = '${pass}'`;
        const queryRes = await zcq.executeZCQLQuery(query);

        if (queryRes.length > 0) {
            const admin = queryRes[0].Admins;
            return res.json({ user: { ...admin, role: 'hoteladmin' } });
        }

        res.status(401).json({ error: 'Invalid email or password' });
    } catch (err) {
        console.error('Login Error:', err.message);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/tickets', async (req, res) => {
    const catalystApp = res.locals.catalyst;
    try {
        const zcq = catalystApp.zcql();
        const queryRes = await zcq.executeZCQLQuery(`SELECT * FROM ${TABLE_TICKETS} ORDER BY ROWID DESC`);
        const tickets = queryRes.map(row => {
            const t = row.Tickets;
            // Parse ticketData JSON if stored as string
            try { return { ...t, ...(t.ticketData ? JSON.parse(t.ticketData) : {}) }; } catch(e) { return t; }
        });
        res.json(tickets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/tickets', upload.single('file'), async (req, res) => {
    const catalystApp = res.locals.catalyst;
    const ticketDataString = req.body.ticketData;
    const ticket = JSON.parse(ticketDataString);

    try {
        // 1. Handle File Upload to File Store
        if (req.file) {
            const filestore = catalystApp.filestore();
            const folder = filestore.folder(FOLDER_ATTACHMENTS);
            const uploadRes = await folder.uploadFile({
                code: require('fs').createReadStream(req.file.path),
                name: req.file.originalname
            });
            ticket.attachmentLink = `/baas/v1/project/${process.env.CATALYST_PROJECT_ID}/filestore/folder/${FOLDER_ATTACHMENTS}/file/${uploadRes.id}/download`;
            await fs.unlink(req.file.path).catch(() => { });
        }

        // 2. Save to Data Store
        const table = catalystApp.datastore().table(TABLE_TICKETS);
        await table.insertRow({
            id: ticket.id,
            status: ticket.status || 'open',
            ticketData: JSON.stringify(ticket),
            attachmentLink: ticket.attachmentLink || ''
        });

        res.json({ success: true, ticket });
    } catch (err) {
        console.error('Ticket Creation Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/tickets/:id', async (req, res) => {
    const catalystApp = res.locals.catalyst;
    try {
        const table = catalystApp.datastore().table(TABLE_TICKETS);
        const zcq = catalystApp.zcql();
        
        // Find by custom ID or ROWID
        const query = `SELECT ROWID FROM ${TABLE_TICKETS} WHERE id = '${req.params.id}'`;
        const findRes = await zcq.executeZCQLQuery(query);
        
        if (findRes.length > 0) {
            const rowId = findRes[0].Tickets.ROWID;
            await table.updateRow({
                ROWID: rowId,
                status: req.body.status
            });
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Ticket not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admins', async (req, res) => {
    const catalystApp = res.locals.catalyst;
    try {
        const zcq = catalystApp.zcql();
        const queryRes = await zcq.executeZCQLQuery(`SELECT * FROM ${TABLE_ADMINS}`);
        res.json(queryRes.map(r => r.Admins));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admins', async (req, res) => {
    const catalystApp = res.locals.catalyst;
    try {
        const table = catalystApp.datastore().table(TABLE_ADMINS);
        await table.insertRow(req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admins/:id', async (req, res) => {
    const catalystApp = res.locals.catalyst;
    try {
        const table = catalystApp.datastore().table(TABLE_ADMINS);
        await table.deleteRow(req.params.id); // Assuming ID passed is ROWID
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Backend API Server running at http://localhost:${port}`);
    console.log('Using Zoho Catalyst Data Store and File Store.');
});
