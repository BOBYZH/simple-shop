const express = require('express');
const router = express.Router();

const memberController = require('../controllers/memberController');
const productController = require('../controllers/productController');

// 所有商品頁面(首頁)
router.get('/', productController.getProducts);

// 個別商品頁面
router.get('/products/:id', productController.getProduct);

router.get('/signup', memberController.signUpPage);

router.post('/signup', memberController.signUp);

router.get('/signin', memberController.signInPage);

router.post('/signin', memberController.signIn);

router.post('/logout', memberController.logout);

module.exports = router;
