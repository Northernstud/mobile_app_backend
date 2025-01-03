const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Refresh token route
router.post('/refresh-token', (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token required' });
    }

    // Step 1: Verify the refresh token
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired refresh token' });
        }

        // Step 2: Generate a new access token
        const accessToken = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }  // Access token expires in 15 minutes
        );

        res.json({ accessToken });
    });
});

module.exports = router;
