const mysql = require('mysql');
const dotenv = require('dotenv');

dotenv.config();

const db = mysql.createConnection({
    host: process.env.DB_HOST || '10.11.90.15',
    user: process.env.DB_USER || 'AppUser',
    password: process.env.DB_PASSWORD || 'Special888%',
    database: process.env.DB_NAME || 'FBLA_Mobile_Application_2025',
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

module.exports = db;
