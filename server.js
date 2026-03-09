const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const { OAuth2Client } = require('google-auth-library');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// --------------- Database Setup ---------------

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'app.db');

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT,
        google_id TEXT UNIQUE,
        display_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY,
        sess TEXT NOT NULL,
        expired DATETIME NOT NULL
    );

    CREATE TABLE IF NOT EXISTS menus (
        user_id INTEGER PRIMARY KEY,
        menu_data TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
`);

setInterval(() => {
    db.prepare('DELETE FROM sessions WHERE expired < datetime("now")').run();
}, 60 * 60 * 1000);

// --------------- Session Store (SQLite-backed) ---------------

class SQLiteStore extends session.Store {
    constructor(database) {
        super();
        this.db = database;
    }

    get(sid, cb) {
        try {
            const row = this.db.prepare(
                'SELECT sess FROM sessions WHERE sid = ? AND expired > datetime("now")'
            ).get(sid);
            cb(null, row ? JSON.parse(row.sess) : null);
        } catch (err) { cb(err); }
    }

    set(sid, sess, cb) {
        try {
            const maxAge = sess.cookie?.maxAge || 30 * 24 * 60 * 60 * 1000;
            const expired = new Date(Date.now() + maxAge).toISOString();
            this.db.prepare(
                'INSERT OR REPLACE INTO sessions (sid, sess, expired) VALUES (?, ?, ?)'
            ).run(sid, JSON.stringify(sess), expired);
            cb(null);
        } catch (err) { cb(err); }
    }

    destroy(sid, cb) {
        try {
            this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
            cb(null);
        } catch (err) { cb(err); }
    }

    touch(sid, sess, cb) {
        this.set(sid, sess, cb);
    }
}

// --------------- Middleware ---------------

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

app.use(session({
    store: new SQLiteStore(db),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    }
}));

function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
}

// --------------- Config Route ---------------

app.get('/api/config', (req, res) => {
    res.json({ googleClientId: GOOGLE_CLIENT_ID || null });
});

// --------------- Auth: Username / Password ---------------

app.post('/api/signup', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }
    if (username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const cleanUsername = username.toLowerCase().trim();

    try {
        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
        if (existing) {
            return res.status(409).json({ error: 'This username is already taken.' });
        }

        const hash = await bcrypt.hash(password, 10);
        const result = db.prepare(
            'INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)'
        ).run(cleanUsername, hash, cleanUsername);

        req.session.userId = result.lastInsertRowid;
        req.session.displayName = cleanUsername;

        res.json({ displayName: cleanUsername });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Failed to create account.' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const user = db.prepare(
            'SELECT id, display_name, password_hash FROM users WHERE username = ?'
        ).get(username.toLowerCase().trim());

        if (!user || !user.password_hash) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        req.session.userId = user.id;
        req.session.displayName = user.display_name;

        res.json({ displayName: user.display_name });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed.' });
    }
});

// --------------- Auth: Google Sign-In ---------------

app.post('/api/auth/google', async (req, res) => {
    const { credential } = req.body;

    if (!credential || !googleClient) {
        return res.status(400).json({ error: 'Google sign-in is not available.' });
    }

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const googleId = payload.sub;
        const name = payload.name || payload.email;

        let user = db.prepare('SELECT id, display_name FROM users WHERE google_id = ?').get(googleId);

        if (!user) {
            const result = db.prepare(
                'INSERT INTO users (google_id, display_name) VALUES (?, ?)'
            ).run(googleId, name);
            user = { id: result.lastInsertRowid, display_name: name };
        }

        req.session.userId = user.id;
        req.session.displayName = user.display_name;

        res.json({ displayName: user.display_name });
    } catch (err) {
        console.error('Google auth error:', err);
        res.status(401).json({ error: 'Google sign-in failed.' });
    }
});

// --------------- Session ---------------

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed.' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

app.get('/api/me', (req, res) => {
    if (req.session.userId) {
        res.json({ displayName: req.session.displayName });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// --------------- Menu Routes ---------------

app.get('/api/menu', requireAuth, (req, res) => {
    const row = db.prepare('SELECT menu_data FROM menus WHERE user_id = ?').get(req.session.userId);
    res.json(row ? JSON.parse(row.menu_data) : null);
});

app.put('/api/menu', requireAuth, (req, res) => {
    const menuData = req.body;
    db.prepare(
        'INSERT OR REPLACE INTO menus (user_id, menu_data, updated_at) VALUES (?, ?, datetime("now"))'
    ).run(req.session.userId, JSON.stringify(menuData));
    res.json({ success: true });
});

// --------------- Start ---------------

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (GOOGLE_CLIENT_ID) {
        console.log('Google Sign-In enabled');
    } else {
        console.log('Google Sign-In disabled (set GOOGLE_CLIENT_ID to enable)');
    }
});
