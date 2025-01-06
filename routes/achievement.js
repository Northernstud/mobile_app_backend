const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// POST achievement
router.post('/new_achievement', authenticateToken, (req, res) => {
    const { achievementTypeId } = req.body;
    const userId = req.user.id; // Extract user ID from the verified JWT payload

    // Step 1: Check if the achievement already exists
    const checkQuery = `
        SELECT * FROM achievements 
        WHERE user_id = ? AND achievement_type_id = ?
    `;
    db.query(checkQuery, [userId, achievementTypeId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to check achievement.' });
        }

        if (results.length > 0) {
            return res.status(409).json({ error: 'Achievement already exists for this user.' });
        }

        // Step 2: If not, insert the new achievement
        const insertQuery = `
            INSERT INTO achievements (user_id, achievement_type_id) 
            VALUES (?, ?)
        `;
        db.query(insertQuery, [userId, achievementTypeId], (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to add achievement.' });
            }
            res.status(201).json({ message: 'Achievement added successfully.' });
        });
    });
});

// GET game achievements 
router.get('/games', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const query = `
        SELECT COUNT(*) AS gameAchievements 
        FROM achievements 
        WHERE user_id = ? AND achievement_type_id IN (1, 2);
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch game achievements.' });
        }
        res.status(200).json({ gameAchievements: results[0].gameAchievements });
    });
});

// GET quiz achievements
router.get('/quizzes', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const query = `
        SELECT COUNT(*) AS quizAchievements 
        FROM achievements 
        WHERE user_id = ? AND achievement_type_id IN (3, 4);
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch quiz achievements.' });
        }
        res.status(200).json({ quizAchievements: results[0].quizAchievements });
    });
});

// GET total achievements
router.get('/total', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const query = `
        SELECT COUNT(*) AS achievements 
        FROM achievements 
        WHERE user_id = ?
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch total achievements.' });
        }
        res.status(200).json({ achievements: results[0].achievements });
    });
});

module.exports = router;
