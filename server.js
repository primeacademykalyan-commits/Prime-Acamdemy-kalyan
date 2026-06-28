const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Connect to local SQLite database file
const db = new sqlite3.Database('./academy.db', (err) => {
    if (err) console.error(err.message);
    console.log('Connected to the academy database.');
});

// Create tables for Admin, Teachers, Students, and Class Schedules
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT CHECK(role IN ('admin', 'teacher', 'student'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject TEXT,
        batch TEXT,
        timing TEXT,
        teacher_id INTEGER,
        announcement TEXT,
        FOREIGN KEY(teacher_id) REFERENCES users(id)
    )`);
});

// --- API ENDPOINTS ---

// 1. Unified Authentication Endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT id, username, role FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            res.json({ success: true, user: row });
        } else {
            res.status(401).json({ success: false, message: "Invalid credentials" });
        }
    });
});

// 2. Teacher Endpoint: Update Class Announcement & Schedule
app.post('/api/teacher/update-class', (req, res) => {
    const { classId, announcement, timing } = req.body;
    db.run(`UPDATE classes SET announcement = ?, timing = ? WHERE id = ?`, [announcement, timing, classId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Class updated successfully" });
    });
});

// 3. Student Endpoint: Fetch personal schedule and teacher announcements
app.get('/api/student/dashboard/:batchName', (req, res) => {
    const batchName = req.params.batchName;
    db.all(`SELECT classes.subject, classes.timing, classes.announcement, users.username as teacher 
            FROM classes 
            JOIN users ON classes.teacher_id = users.id 
            WHERE classes.batch = ?`, [batchName], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));