// ================================
// IMPORT REQUIRED PACKAGES
// ================================

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const cors = require("cors");
const jwt = require("jsonwebtoken");

// ================================
// INITIALIZE EXPRESS APP
// ================================

const app = express();
const PORT = 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Secret key for JWT
const SECRET_KEY = "studyplanner_secret_key";

// ================================
// CONNECT SQLITE DATABASE
// ================================

const db = new sqlite3.Database("./backend/database.db", (err) => {
    if (err) {
        console.log(err.message);
    } else {
        console.log("✅ Connected to SQLite database");
    }
});


// ================================
// CREATE TABLES AUTOMATICALLY
// ================================

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE,
            password TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            subject_name TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_id INTEGER,
            task_name TEXT,
            deadline TEXT,
            status TEXT DEFAULT 'pending'
        )
    `);

});


// ================================
// TEST ROUTE
// ================================

app.get("/", (req, res) => {
    res.send("🚀 Smart Study Planner Backend Running");
});

// ================================
// SIGNUP API
// ================================

app.post("/signup", async (req, res) => {

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.json({ success: false, message: "All fields required" });
    }

    try {

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = `
            INSERT INTO users (name, email, password)
            VALUES (?, ?, ?)
        `;

        db.run(query, [name, email, hashedPassword], function (err) {

            if (err) {
                return res.json({
                    success: false,
                    message: "Email already exists"
                });
            }

            res.json({
                success: true,
                message: "User registered successfully"
            });

        });

    } catch (error) {

        res.json({
            success: false,
            message: "Signup failed"
        });

    }

});

// ================================
// LOGIN API
// ================================

app.post("/login", (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.json({
            success: false,
            message: "All fields required"
        });
    }

    const query = `
        SELECT * FROM users WHERE email = ?
    `;

    db.get(query, [email], async (err, user) => {

        if (!user) {
            return res.json({
                success: false,
                message: "Invalid email"
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.json({
                success: false,
                message: "Invalid password"
            });
        }

        // Create token
        const token = jwt.sign(
            { id: user.id },
            SECRET_KEY,
            { expiresIn: "7d" }
        );

        res.json({
            success: true,
            message: "Login successful",
            token,
            userId: user.id
        });

    });

});

// ================================
// AUTH MIDDLEWARE
// ================================

function authenticateToken(req, res, next) {

    const token = req.headers["authorization"];

    if (!token) {
        return res.json({
            success: false,
            message: "Access denied"
        });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {

        if (err) {
            return res.json({
                success: false,
                message: "Invalid token"
            });
        }

        req.user = user;
        next();

    });

}

// ================================
// ADD SUBJECT
// ================================

app.post("/add-subject", authenticateToken, (req, res) => {

    const { subject_name } = req.body;
    const user_id = req.user.id;

    const query = `
        INSERT INTO subjects (user_id, subject_name)
        VALUES (?, ?)
    `;

    db.run(query, [user_id, subject_name], function (err) {

        if (err) {
            return res.json({
                success: false,
                message: "Failed to add subject"
            });
        }

        res.json({
            success: true,
            message: "Subject added successfully"
        });

    });

});


// ================================
// GET SUBJECTS
// ================================

app.get("/subjects", authenticateToken, (req, res) => {

    const user_id = req.user.id;

    const query = `
        SELECT * FROM subjects WHERE user_id = ?
    `;

    db.all(query, [user_id], (err, rows) => {

        res.json({
            success: true,
            subjects: rows
        });

    });

});


// ================================
// DELETE SUBJECT
// ================================

app.delete("/delete-subject/:id", authenticateToken, (req, res) => {

    const subjectId = req.params.id;

    db.run(
        "DELETE FROM subjects WHERE id = ?",
        [subjectId],
        (err) => {

            if (err) {
                return res.json({
                    success: false
                });
            }

            res.json({
                success: true,
                message: "Subject deleted"
            });

        }
    );

});


// ================================
// ADD TASK
// ================================

app.post("/add-task", authenticateToken, (req, res) => {

    const { subject_id, task_name, deadline } = req.body;

    const query = `
        INSERT INTO tasks (subject_id, task_name, deadline)
        VALUES (?, ?, ?)
    `;

    db.run(query, [subject_id, task_name, deadline], (err) => {

        if (err) {
            return res.json({
                success: false
            });
        }

        res.json({
            success: true,
            message: "Task added successfully"
        });

    });

});


// ================================
// GET TASKS
// ================================

app.get("/tasks/:subjectId", authenticateToken, (req, res) => {

    const subjectId = req.params.subjectId;

    db.all(
        "SELECT * FROM tasks WHERE subject_id = ?",
        [subjectId],
        (err, rows) => {

            res.json({
                success: true,
                tasks: rows
            });

        }
    );

});


// ================================
// UPDATE TASK STATUS
// ================================

app.put("/update-task/:id", authenticateToken, (req, res) => {

    const taskId = req.params.id;
    const { status } = req.body;

    db.run(
        "UPDATE tasks SET status = ? WHERE id = ?",
        [status, taskId],
        (err) => {

            if (err) {
                return res.json({
                    success: false
                });
            }

            res.json({
                success: true,
                message: "Task updated"
            });

        }
    );

});


// ================================
// DELETE TASK
// ================================

app.delete("/delete-task/:id", authenticateToken, (req, res) => {

    const taskId = req.params.id;

    db.run(
        "DELETE FROM tasks WHERE id = ?",
        [taskId],
        (err) => {

            if (err) {
                return res.json({
                    success: false
                });
            }

            res.json({
                success: true,
                message: "Task deleted"
            });

        }
    );

});

// ================================
// DASHBOARD STATS API
// ================================

app.get("/dashboard-stats", authenticateToken, (req, res) => {

    const user_id = req.user.id;

    const query = `
        SELECT
            (SELECT COUNT(*) FROM subjects WHERE user_id = ?) AS totalSubjects,

            (SELECT COUNT(*) FROM tasks
             WHERE subject_id IN
             (SELECT id FROM subjects WHERE user_id = ?)
            ) AS totalTasks,

            (SELECT COUNT(*) FROM tasks
             WHERE status = 'completed'
             AND subject_id IN
             (SELECT id FROM subjects WHERE user_id = ?)
            ) AS completedTasks,

            (SELECT COUNT(*) FROM tasks
             WHERE status = 'pending'
             AND subject_id IN
             (SELECT id FROM subjects WHERE user_id = ?)
            ) AS pendingTasks
    `;

    db.get(query, [user_id, user_id, user_id, user_id], (err, row) => {

        res.json({
            success: true,
            stats: row
        });

    });

});


// GET TASKS BY SUBJECT
app.get("/tasks-by-subject/:id", authenticateToken,(req,res)=>{

const subjectId=req.params.id;

db.all(
"SELECT * FROM tasks WHERE subject_id=?",
[subjectId],
(err,rows)=>{

res.json({
success:true,
tasks:rows
});

});

});

// ================================
// START SERVER
// ================================

app.listen(PORT, () => {
    console.log(`🔥 Server running on http://localhost:${PORT}`);
});