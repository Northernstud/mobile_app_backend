const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./database');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const [user] = await db.promise().query('SELECT id FROM users WHERE google_id = ?', [profile.id]);
        if (user.length === 0) {
            const result = await db.promise().query(
                'INSERT INTO users (username, email, google_id) VALUES (?, ?, ?)',
                [profile.displayName, profile.emails[0].value, profile.id]
            );
            return done(null, { id: result.insertId });
        } else {
            return done(null, { id: user[0].id });
        }
    } catch (err) {
        return done(err);
    }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const [user] = await db.promise().query('SELECT id, username, email FROM users WHERE id = ?', [id]);
        done(null, user[0]);
    } catch (err) {
        done(err);
    }
});

module.exports = passport;
