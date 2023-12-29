const Post = require('../models/postModel')
const User = require('../models/userModel')
const fs = require('fs')
const path = require('path')
const {v4:uuid} = require('uuid')
const HttpError = require("../models/errorModel");



/*
Create post
POST : api/posts
Protected
*/

const createPost = async(req, res, next) => {
    try {

        const {title, category, description} = req.body;
        if(!title || !category || !description || !req.files){
            return next(new HttpError('Fill in all fields and chose thumbnail.', 422))
        }
        const {thumbnail} = req.files;

        //check file size
        if (thumbnail.size > 2000000) {
            return next(new HttpError('Thumbnail is too big. Should be less than 2mb.', 422));
        }

        let fileName = thumbnail.name;
        let splittedFilename = fileName.split('.');
        let newFileName = splittedFilename[0] + uuid() + '.' + splittedFilename[splittedFilename.length - 1];

        thumbnail.mv(path.join(__dirname, '..', 'uploads', newFileName), async (err) => {
            if (err) {
                return next(new HttpError(err));
            } else {
                const newPost = await Post.create({title, category, description, thumbnail: newFileName, creator:req.user.id})
                if(!newPost){
                    return next(new HttpError("Post couldn't be created.", 422))
                }
                //find user to increase post counter
                const currentUser = await User.findById(req.user.id)
                const userPostCount = currentUser.posts+1;
                await User.findByIdAndUpdate(req.user.id, {posts:userPostCount})
                res.status(201).json(newPost);
            }

           
        });

    } catch (error) {
        return next(new HttpError(error))
    }
}



/*
Get all posts
GET : api/posts
Unprotected
*/

const getPosts = async(req, res, next) => {
    try {
      const posts = await Post.find().sort({updatedAt: -1})
      res.status(200).json(posts);
    } catch (error) {
        return next(new HttpError(error)) 
    }
}



/*
Get single post
GET : api/posts/:id
Unprotected
*/

const getPost = async(req, res, next) => {
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId)
        if(!post){
            return next(new HttpError("Post not found.", 404))
        }
        res.status(200).json(post);
      } catch (error) {
          return next(new HttpError(error)) 
      }
}



/*
Get posts by category
GET : api/posts/categories/:category
Unprotected
*/

const getCatPosts = async(req, res, next) => {
    try {
        const {category} = req.params;
        const posts = await Post.find({category}).sort({createdAt: -1})
        res.status(200).json(posts);
      } catch (error) {
          return next(new HttpError(error)) 
      }
}


/*
Get posts by authors/users
GET : api/posts/users/:id
Unprotected
*/

const getUsersPosts = async(req, res, next) => {
    try {
        const {id} = req.params;
        const posts = await Post.find({creator: id}).sort({createdAt: -1})
        res.status(200).json(posts);
      } catch (error) {
          return next(new HttpError(error)) 
      }
}


/*
Edit post
PATCH : api/posts/:id
Protected
*/

const editPost = async(req, res, next) => {
    try {
        let fileName;
        let newFileName;
        let updatedPost;
        const postId = req.params.id;
        let {title, category, description} = req.body;
        if(!title || !category || !description){
            return next(new HttpError('Fill in all fields.', 422))
        }

        if(!req.files){
            updatedPost = await Post.findByIdAndUpdate(postId, {title, category, description}, {new:true})
        } else {
         // get old post from database
         const oldPost = await Post.findById(postId)
         if(req.user.id==oldPost.creator){
        //delete old thumbnail from uploads
         fs.unlink(path.join(__dirname, '..', 'uploads', oldPost.thumbnail), async (err) => {
            if (err) {
                return next(new HttpError(err));
            }
        });

         //upload new thumbnail
         const {thumbnail} = req.files;
         //check file size
         if (thumbnail.size > 2000000) {
             return next(new HttpError('Thumbnail is too big. Should be less than 2mb.', 422));
         }

     let fileName = thumbnail.name;
     let splittedFilename = fileName.split('.');
     let newFileName = splittedFilename[0] + uuid() + '.' + splittedFilename[splittedFilename.length - 1];

     thumbnail.mv(path.join(__dirname, '..', 'uploads', newFileName), async (err) => {
         if (err) {
             return next(new HttpError(err));
         } 
     });
     
     updatedPost = await Post.findByIdAndUpdate(postId, {title, category, description, thumbnail: newFileName}, {new:true})

        }
    }
        if(!updatedPost){
            return next(new HttpError("Couldn't update post", 400))
        }
        res.status(200).json(updatedPost);

    } catch (error) {
        return next(new HttpError(error)) 
    }
}


/*
Delete post
DELETE : api/posts/:id
Protected
*/

const deletePost = async(req, res, next) => {
    try {
        const postId = req.params.id;
        if(!postId){
            return next(new HttpError('Post Unavailable.', 422))
        }
        const post = await Post.findById(postId)
        const fineName = post.thumbnail;
        if(req.user.id == post.creator){
        //delete thumbnail from uploaded folder
        fs.unlink(path.join(__dirname, '..', 'uploads', fineName), async (err) => {
            if (err) {
                return next(new HttpError(err));
            } else {
                await Post.findByIdAndDelete(postId)
                //find user to decrease post counter
                const currentUser = await User.findById(req.user.id)
                const userPostCount = currentUser.posts-1;
                await User.findByIdAndUpdate(req.user.id, {posts:userPostCount})
                res.json(`Post ${postId} deleted successfully.`)
            }
        });
    } else {
        return next(new HttpError("Post couldn't be deleted.", 422))
    } 
    } catch (error) {
        return next(new HttpError(error)) 
    }
}

module.exports = {createPost, getPosts, getPost, getCatPosts, getUsersPosts, editPost, deletePost}