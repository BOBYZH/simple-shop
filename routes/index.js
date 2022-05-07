const express = require('express');
const router = express.Router();

const memberController = require('../controllers/memberController');
const productController = require('../controllers/productController');

router.get('/', productController.getProducts);

router.get('/signup', memberController.signUpPage);

router.post('/signup', memberController.signUp);

router.get('/signin', memberController.signInPage);

router.post('/signin', memberController.signIn);

router.post('/logout', memberController.logout);

module.exports = router;
