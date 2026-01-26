const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const pool = require('./db');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (home.html)
app.use(express.static(path.join(__dirname, 'public')));

// Tables zose
const tables = ['student','mentor','admin'];

// ------------------------
// Registration
// ------------------------
app.post('/create-account', async (req, res) => {
    const { full_name, email, password, role } = req.body;

    const table = role.toLowerCase();
    if (!tables.includes(table)) return res.status(400).json({ message: 'Role invalid' });

    try {
        // Check email
        const exists = await pool.query(`SELECT * FROM ${table} WHERE email=$1`, [email]);
        if (exists.rows.length > 0) return res.status(400).json({ message: 'Email yamaze gukoreshwa' });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert
        const result = await pool.query(
            `INSERT INTO ${table} (full_name,email,password) VALUES($1,$2,$3) RETURNING *`,
            [full_name,email,hashedPassword]
        );

        res.json({ message: 'Account yakozwe neza!', user: result.rows[0] });
    } catch(err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// ------------------------
// Login (email + password only)
// ------------------------
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        for (const table of tables) {
            const result = await pool.query(`SELECT * FROM ${table} WHERE email=$1`, [email]);
            if (result.rows.length > 0) {
                const user = result.rows[0];
                const valid = await bcrypt.compare(password, user.password);
                if (!valid) return res.status(400).json({ message: 'Password ntabwo ariyo' });

                return res.json({ message: `Login yagenze neza! User ari muri table: ${table}`, user: { id: user.id, full_name: user.full_name, email: user.email } });
            }
        }

        res.status(400).json({ message: 'Email ntabwo ibaho muri system' });
    } catch(err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));
