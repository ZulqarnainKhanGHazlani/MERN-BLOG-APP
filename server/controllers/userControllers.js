const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const fs = require('fs')
const path = require('path')
const {v4:uuid} = require('uuid')
const HttpError = require("../models/errorModel");
const User = require('../models/userModel')


/* 
Register a new user
POST : api/users/register
Unprotected
*/

const registerUser = async (req, res, next) => {
    try {
        const {name, email, password, password2} = req.body;
        if(!name || !email || !password){
            return next(new HttpError('Fill in all fields.', 422))
        }
        const newEmail = email.toLowerCase();
        const emailExists = await User.findOne({email : newEmail})
        if(emailExists){
            return next(new HttpError('Email already exists.', 422))
        }

        if((password.trim()).length < 6){
            return next(new HttpError('Password should be at least 6 characters.', 422))
        }

        if(password != password2){
            return next(new HttpError('Passwords do not match.', 422))
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPass = await bcrypt.hash(password, salt);
        // console.log('name :'+name+' email :'+newEmail+' password :'+hashedPass);return false;
        const newUser = await User.create({name, email:newEmail, password:hashedPass})
        res.status(201).json(`New user ${newUser.email} registered.`);


    } catch(error) {
       return next(new HttpError('User registration failed.', 422))
    }

};


/* 
Login a new user
POST : api/users/login
Unprotected
*/

const loginUser = async (req, res, next) => {
    try {

        const {email, password} = req.body;
        if(!email || !password){
            return next(new HttpError('Fill in all fields.', 422))
        }
        const newEmail = email.toLowerCase();
        const user = await User.findOne({email : newEmail})
        if(!user){
            return next(new HttpError('Invalid credentials.', 422))
        }
        const comparePass = await bcrypt.compare(password, user.password);
        if(!comparePass){
            return next(new HttpError('Invalid credentials.', 422))
        }

        const {_id:id, name} = user;
        const token = jwt.sign({id, name} , process.env.JWT_SECRET, {expiresIn:"1d"})
        res.status(200).json({token, id, name});
    } catch(error) {
        return next(new HttpError('Login failed, please check your credentials.', 422))
    }
};


/* 
User profile
POST : api/users/:id
Protected
*/

const getUser = async (req, res, next) => {
    try {
        const {id} = req.params;
        const user = await User.findById(id).select('-password')
        if(!user){
            return next(new HttpError('User not found.', 404))
        }
        res.status(200).json(user);
    } catch (error) {
        return next(new HttpError(error))
    }
};


/* 
User change avatar(profile)
POST : api/users/change-avatar
Protected
*/

const changeAvatar = async (req, res, next) => {
    try {
        if (!req.files.avatar) {
            return next(new HttpError('Please choose an image.', 422));
        }

        // Find user from the database
        const user = await User.findById(req.user.id);

        // Delete old avatar if it exists
        if (user.avatar) {
            const avatarPath = path.join(__dirname, '..', 'uploads', user.avatar);
            if (fs.existsSync(avatarPath)) {
                fs.unlink(avatarPath, (err) => {
                    if (err) {
                        return next(new HttpError(err));
                    }
                });
            }
        }

        const avatar = req.files.avatar;
        if (avatar.size > 500000) {
            return next(new HttpError('Profile picture too big. Should be less than 500kb.', 422));
        }

        let fileName = avatar.name;
        if (!fileName) {
            return next(new HttpError('Invalid file name.', 422));
        }

        let splittedFilename = fileName.split('.');
        let newFileName = splittedFilename[0] + uuid() + '.' + splittedFilename[splittedFilename.length - 1];

        avatar.mv(path.join(__dirname, '..', 'uploads', newFileName), async (err) => {
            if (err) {
                return next(new HttpError(err));
            }

            const updatedAvatar = await User.findByIdAndUpdate(req.user.id, { avatar: newFileName }, { new: true });
            if (!updatedAvatar) {
                return next(new HttpError("Avatar couldn't be changed.", 422));
            }
            res.status(200).json(updatedAvatar);
        });
    } catch (error) {
        return next(new HttpError(error));
    }
};




/* 
Edit user details
POST : api/users/edit-user
Protected
*/

const editUser = async (req, res, next) => {
    try {

        const {name, email, currentPassword, newPassword, confirmNewPassword} = req.body;
        if(!name || !email || !currentPassword || !newPassword){
            return next(new HttpError('Fill in all fields.', 422))
        }
        //get user from database
        const user = await User.findById(req.user.id)
        if(!user){
            return next(new HttpError('User not found.', 403))
        }
        //check email already exists
        const emailExists = await User.findOne({email})
        if(emailExists && (emailExists._id != req.user.id)){
            return next(new HttpError('Email already exists.', 422))
        }
        //compare current password to db password
         const validateUserPassword = await bcrypt.compare(currentPassword, user.password)
         if(!validateUserPassword){
            return next(new HttpError('Invalid current password.', 422))
        }
        //compare new password
        if(newPassword !== confirmNewPassword){
            return next(new HttpError('New password do not match.', 422))
        }
        //hash new password
        const salt = await bcrypt.genSalt(10)
        const hash = await bcrypt.hash(newPassword, salt)
        //update user info in database
        const newInfo = await User.findByIdAndUpdate(req.user.id, {name, email, password: hash}, {new:true})
        res.status(200).json(newInfo);
        
    } catch (error) {
        return next(new HttpError(error));
    }
};


/* 
Get Authors
POST : api/users/authors
Unprotected
*/

const getAuthors = async (req, res, next) => {
    try {
        const authors = await User.find().select('-password')
        res.status(200).json(authors);
    } catch (error) {
        return next(new HttpError(error))
    }
};

module.exports = {registerUser, loginUser, getUser, changeAvatar, editUser, getAuthors}