const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../models/db');
const { sendVerificationEmail } = require('../utils/emailSender');
const { generateToken } = require('../utils/tokenGenerator');

const secretKey = process.env.JWT_SECRET || 'secret';

exports.signup = async (req, res) => {
};

exports.login = async (req, res) => {

};

exports.verifyEmail = async (req, res) => {

};
