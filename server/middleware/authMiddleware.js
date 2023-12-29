const jwt = require('jsonwebtoken');
const HttpError = require('../models/errorModel');

const authMiddleware = async (req, res, next) => {
  const authorizationHeader = req.headers['authorization'] || req.headers['Authorization'];
  
  if (authorizationHeader && authorizationHeader.startsWith('Bearer')) {
    const token = authorizationHeader.split(' ')[1];
    
    jwt.verify(token, process.env.JWT_SECRET, (err, info) => {
      if (err) {
        return next(new HttpError("Unauthorized, Invalid token.", 403));
      }
      
      req.user = info;
      next();
    });
  } else {
    return next(new HttpError("Unauthorized, No token.", 402));
  }
};

module.exports = authMiddleware;
