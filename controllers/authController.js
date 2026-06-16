const userModel = require("../models/user-model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { generateToken } = require("../utils/generateToken");

module.exports.registerUser = async function(req, res) {
    try {
        let { email, password, fullname } = req.body;
        let user = await userModel.findOne({ email: email });
        if (user) {
            req.flash('error', 'This email is already registered. Please login.');
            return res.redirect('/');
        }

        bcrypt.genSalt(10, function(err, salt) {
            if (err) {
                req.flash('error', 'Something went wrong. Please try again.');
                return res.redirect('/');
            }
            bcrypt.hash(password, salt, async function(err, hash) {
                if (err) {
                    req.flash('error', 'Something went wrong. Please try again.');
                    return res.redirect('/');
                }
                try {
                    let createdUser = await userModel.create({
                        email,
                        password: hash,
                        fullname,
                    });

                    let token = generateToken(createdUser);
                    res.cookie('token', token);
                    return res.redirect('/shop');
                } catch (createErr) {
                    req.flash('error', 'Unable to create account. Please try again.');
                    return res.redirect('/');
                }
            });
        });
    } catch (err) {
        req.flash('error', 'Unable to process your request. Please try again.');
        return res.redirect('/');
    }
};

module.exports.loginUser = async function(req, res) {
    let { email, password } = req.body;
    try {
        let user = await userModel.findOne({ email: email });
        if (!user) {
            req.flash('error', 'Email or password is incorrect.');
            return res.redirect('/');
        }

        bcrypt.compare(password, user.password, function(err, result) {
            if (err || !result) {
                req.flash('error', 'Email or password is incorrect.');
                return res.redirect('/');
            }
            let token = generateToken(user);
            res.cookie('token', token);
            return res.redirect('/shop');
        });
    } catch (err) {
        req.flash('error', 'Unable to process your login. Please try again.');
        return res.redirect('/');
    }
};
