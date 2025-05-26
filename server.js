const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

const allowedOrigins = [
  'https://paragons1723-production.up.railway.app',
  'http://localhost:3000'
];

// CORS MUST BE FIRST!
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static('public'));

// Configure your MySQL connection
const db = mysql.createConnection({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT
});

// Create table if not exists (updated fields)
db.query(`CREATE TABLE IF NOT EXISTS profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    fullName VARCHAR(255) NOT NULL,
    bio TEXT,
    hobbies VARCHAR(255),
    whatsapp VARCHAR(32),
    instagram VARCHAR(128),
    twitter VARCHAR(128),
    photo MEDIUMTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

db.query(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);

const SECRET = 'Vocational200.'; // Use a strong secret in production

// Register
app.post('/api/register', (req, res) => {
    const { email, password } = req.body;
    const password_hash = bcrypt.hashSync(password, 10);
    db.query('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, password_hash], (err, result) => {
        if (err) return res.status(400).json({ error: 'Email already exists' });
        res.json({ success: true });
    });
});

// Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        const user = results[0];
        if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ user_id: user.id, email: user.email }, SECRET, { expiresIn: '1h' });
        res.json({ token });
    });
});

// Middleware to check auth
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Save profile (authenticated)
app.post('/api/profiles', authenticateToken, (req, res) => {
    const { fullName, bio, hobbies, whatsapp, instagram, twitter, photo } = req.body;
    const user_id = req.user.user_id;
    db.query('SELECT id FROM profiles WHERE user_id = ?', [user_id], (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length > 0) {
            const id = results[0].id;
            db.query(
                'UPDATE profiles SET fullName=?, bio=?, hobbies=?, whatsapp=?, instagram=?, twitter=?, photo=? WHERE id=?',
                [fullName, bio, hobbies, whatsapp, instagram, twitter, photo, id],
                (err2) => {
                    if (err2) return res.status(500).send(err2);
                    res.json({ success: true, updated: true, id });
                }
            );
        } else {
            db.query(
                'INSERT INTO profiles (fullName, bio, hobbies, whatsapp, instagram, twitter, photo, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [fullName, bio, hobbies, whatsapp, instagram, twitter, photo, user_id],
                (err3, result) => {
                    if (err3) return res.status(500).send(err3);
                    res.json({ success: true, updated: false, id: result.insertId });
                }
            );
        }
    });
});

// Get profile by user ID (authenticated)
app.get('/api/profiles/me', authenticateToken, (req, res) => {
    const user_id = req.user.user_id;
    db.query('SELECT * FROM profiles WHERE user_id = ?', [user_id], (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length === 0) return res.status(404).json({ error: 'Profile not found' });
        res.json(results[0]);
    });
});

// Get all profiles (public)
app.get('/api/profiles', (req, res) => {
    db.query('SELECT * FROM profiles', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// Get profile by ID (public)
app.get('/api/profiles/:id', (req, res) => {
    const { id } = req.params;
    db.query('SELECT * FROM profiles WHERE id = ?', [id], (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length === 0) return res.status(404).json({ error: 'Profile not found' });
        res.json(results[0]);
    });
});

// Update profile by ID (authenticated, own profile only)
app.put('/api/profiles/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { fullName, bio, hobbies, whatsapp, instagram, twitter, photo } = req.body;
    const user_id = req.user.user_id;
    db.query('SELECT * FROM profiles WHERE id = ?', [id], (err, results) => {
        if (err || results.length === 0) return res.sendStatus(404);
        if (results[0].user_id !== user_id) return res.sendStatus(403);
        db.query(
            'UPDATE profiles SET fullName=?, bio=?, hobbies=?, whatsapp=?, instagram=?, twitter=?, photo=? WHERE id=?',
            [fullName, bio, hobbies, whatsapp, instagram, twitter, photo, id],
            (err2) => {
                if (err2) return res.status(500).send(err2);
                res.json({ success: true });
            }
        );
    });
});

// Delete profile by ID (authenticated, own profile only)
app.delete('/api/profiles/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const user_id = req.user.user_id;
    db.query('SELECT * FROM profiles WHERE id = ?', [id], (err, results) => {
        if (err || results.length === 0) return res.sendStatus(404);
        if (results[0].user_id !== user_id) return res.sendStatus(403);
        db.query('DELETE FROM profiles WHERE id = ?', [id], (err2) => {
            if (err2) return res.status(500).send(err2);
            res.json({ success: true });
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Image tag example (to be used in your HTML/JSX):
// <img src="${profile.photo && profile.photo.startsWith('data:') 
//     ? profile.photo o be used in your HTML/JSX):
//     : (profile.photo ? profile.photo : 'photos/default.jpg')}" alt="${profile.fullName}">
//     ? profile.photo 
//     : (profile.photo ? profile.photo : 'photos/default.jpg')}" alt="${profile.fullName}">