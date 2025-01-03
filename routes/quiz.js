const express = require('express');
const db = require('../config/database'); // Import the database connection
const router = express.Router();

// Endpoint to fetch all questions with their answers
router.get('/', (req, res) => {
    const query = `
        SELECT 
        q.id AS question_id, 
        q.question_text, 
        a.id AS answer_id, 
        a.answer_text, 
        a.is_correct 
        FROM questions q
        JOIN answers a ON q.id = a.question_id
        ORDER BY q.id, a.id;
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching questions:', err);
            res.status(500).send('Error fetching questions');
            return;
        }

        // Group answers by question
        const questions = {};
        results.forEach((row) => {
            if (!questions[row.question_id]) {
                questions[row.question_id] = {
                    id: row.question_id,
                    question: row.question_text,
                    answers: []
                };
            }
            questions[row.question_id].answers.push({
                id: row.answer_id,
                text: row.answer_text,
                isCorrect: row.is_correct
            });
        });

        res.json(Object.values(questions));
    });
});

router.get('/hello', (req, res) => {
    res.send("this is /hello")
})

module.exports = router;
