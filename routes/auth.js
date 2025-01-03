const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const rateLimiter = require('../middlewares/rateLimiter');
const { isValidPassword } = require('../utils/validators');
const transporter = require('../utils/emailService');
const passport = require("../config/passport")

const router = express.Router();
const saltRounds = 10;

// Signup Route
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    try {
        // Check if the email already exists
        const checkEmailQuery = 'SELECT id FROM users WHERE email = ?';
        db.query(checkEmailQuery, [email], async (err, results) => {
            if (err) {
                console.error('Database query error:', err.message);
                return res.status(500).json({ message: 'Database error' });
            }

            if (results.length > 0) {
                return res.status(409).json({ message: 'Email is already registered' });
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert the new user into the database
            const insertQuery = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
            db.query(insertQuery, [username, email, hashedPassword], (err, result) => {
                if (err) {
                    console.error('Database insertion error:', err.message);
                    return res.status(500).json({ message: 'Failed to register user' });
                }

                // Generate a token for the newly registered user
                const token = jwt.sign(
                    { id: result.insertId, username, email },
                    process.env.JWT_SECRET,
                    { expiresIn: '1h' }
                );

                const refreshToken = jwt.sign(
                    { id: user.id, username: user.username, email: user.email },
                    process.env.JWT_REFRESH_SECRET,
                    { expiresIn: '182d' }
                );

                res.status(201).json({ 
                    message: 'User registered successfully',
                    token,
                    refreshToken,
                    user: { id: result.insertId, username, email }
                });

                console.log(`${username} just sign up in.`);
            });
        });
    } catch (error) {
        console.error('Server error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        // Fetch user by email
        const query = 'SELECT id, username, email, password FROM users WHERE email = ?';
        db.query(query, [email], async (err, results) => {
            if (err) {
                console.error('Database query error:', err.message);
                return res.status(500).json({ message: 'Database error' });
            }

            if (results.length === 0) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            const user = results[0];

            // Check password
            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // Generate JWT token
            const token = jwt.sign(
                { id: user.id, username: user.username, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            const refreshToken = jwt.sign(
                { id: user.id, username: user.username, email: user.email },
                process.env.JWT_REFRESH_SECRET,
                { expiresIn: '182d' }
            );

            res.status(200).json({ token, refreshToken, user: { id: user.id, username: user.username, email: user.email } });
            console.log(`${user.username} just logged in.`)
        });
    } catch (error) {
        console.error('Server error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect('/dashboard');
    }
);

module.exports = router;
