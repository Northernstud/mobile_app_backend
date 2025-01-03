const express = require('express');
const { authenticateToken } = require('../middlewares/auth');
const db = require('../config/database');

const router = express.Router();

// Get User Recent Quiz Score Route
router.get('/recent_quiz_score', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const query = `
        SELECT 
            us.score, 
            us.attempted_at 
        FROM quiz_scores us
        WHERE us.user_id = ? 
          AND us.attempted_at = (
              SELECT MAX(attempted_at) 
              FROM quiz_scores 
              WHERE user_id = us.user_id
          )
        ORDER BY us.attempted_at DESC;
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching scores:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'No scores found for this user' });
        }

        const scores = results.map(row => ({
            score: row.score,
            attemptedAt: row.attempted_at
        }));

        res.json({ recentQuizScores: scores });
    });
});

router.get('/quiz_scores', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const query = `
        SELECT 
            us.id AS score_id, 
            q.id AS question_id,
            q.question_text, 
            us.is_correct, 
            us.score, 
            us.attempted_at 
        FROM quiz_scores us
        JOIN questions q ON us.question_id = q.id
        WHERE us.user_id = ?
        ORDER BY us.attempted_at DESC;
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching scores:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'No scores found for this user' });
        }

        const groupedScores = results.reduce((acc, row) => {
            if (!acc[row.question_id]) {
                acc[row.question_id] = {
                    question: row.question_text,
                    scores: []
                };
            }
            acc[row.question_id].scores.push({
                score_id: row.score_id,
                isCorrect: row.is_correct,
                score: row.score,
                attemptedAt: row.attempted_at
            });
            return acc;
        }, {});

        res.json(groupedScores);
    });
});

router.put('/achievement_unlocked', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { quizProgress = 0, gameProgress = 0 } = req.body;

    if (quizProgress < 0 || gameProgress < 0) {
        return res.status(400).json({ error: 'Progress values cannot be negative.' });
    }

    try {
        const updateQuery = `
            INSERT INTO achievement_unlocked (user_id, quiz_achievements, game_achievements)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
                quiz_achievements = quiz_achievements + VALUES(quiz_achievements),
                game_achievements = game_achievements + VALUES(game_achievements);
        `;
        await db.promise().query(updateQuery, [userId, quizProgress, gameProgress]);

        const [userProgress] = await db.promise().query(
            'SELECT quiz_achievements, game_achievements FROM achievement_unlocked WHERE user_id = ?',
            [userId]
        );

        const { quiz_achievements, game_achievements } = userProgress[0];

        const [allAchievements] = await db.promise().query('SELECT * FROM achievements');

        const unlockedAchievements = allAchievements.filter(achievement => {
            if (achievement.type === 'quiz' && quiz_achievements >= achievement.criteria) {
                return true;
            }
            if (achievement.type === 'game' && game_achievements >= achievement.criteria) {
                return true;
            }
            return false;
        });

        res.status(200).json({
            message: 'Progress updated successfully',
            unlockedAchievements: unlockedAchievements.map(a => ({
                name: a.name,
                description: a.description
            }))
        });
    } catch (err) {
        console.error('Error updating achievement_unlocked:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/submit_quiz', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { quizId, answers } = req.body;

    if (!quizId || !Array.isArray(answers) || answers.length === 0) {
        return res.status(400).json({ error: 'Invalid quiz data submitted' });
    }

    try {
        const [quizQuestions] = await db.promise().query(`
            SELECT q.id AS question_id, q.correct_answer_id 
            FROM questions q 
            WHERE q.quiz_id = ?;
        `, [quizId]);

        if (quizQuestions.length === 0) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        let totalScore = 0;
        const scoreDetails = answers.map(answer => {
            const question = quizQuestions.find(q => q.question_id === answer.question_id);
            const isCorrect = question && question.correct_answer_id === answer.answer_id;
            const score = isCorrect ? 1 : 0;
            totalScore += score;

            return {
                question_id: answer.question_id,
                is_correct: isCorrect,
                score: score,
                attempted_at: new Date()
            };
        });

        const scoreInsertQuery = `
            INSERT INTO quiz_scores (user_id, question_id, is_correct, score, attempted_at)
            VALUES ?
        `;
        const scoreValues = scoreDetails.map(detail => [
            userId,
            detail.question_id,
            detail.is_correct,
            detail.score,
            detail.attempted_at
        ]);

        await db.promise().query(scoreInsertQuery, [scoreValues]);

        const updateScoreQuery = `
            INSERT INTO user_scores (user_id, quiz_id, score, attempted_at)
            VALUES (?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
            score = score + VALUES(score), attempted_at = NOW();
        `;

        await db.promise().query(updateScoreQuery, [userId, quizId, totalScore]);

        res.status(200).json({ message: 'Quiz submitted successfully', totalScore });
    } catch (err) {
        console.error('Error submitting quiz:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
