const express = require('express');
const router = express.Router();

const memberController = require('../controllers/memberController');
const productController = require('../controllers/productController');
const cartController = require('../controllers/cartController');

// 商品
// 所有商品頁面(首頁)
router.get('/', productController.getProducts);
// 個別商品頁面
router.get('/products/:id', productController.getProduct);

// 購物車
// 購物車內容
router.get('/cart', cartController.getCart);
// 新增商品
router.post('/cart', cartController.postCart);
// 增加數量
router.patch('/cartItem/:id/add', cartController.addCartItem);
// 減少數量
router.patch('/cartItem/:id/sub', cartController.subCartItem);
// 移除商品
router.delete('/cartItem/:id', cartController.deleteCartItem);

// 帳戶
// 註冊頁面
router.get('/signup', memberController.signUpPage);
// 註冊
router.post('/signup', memberController.signUp);
// 登入頁面
router.get('/signin', memberController.signInPage);
// 登入
router.post('/signin', memberController.signIn);
// 登出
router.post('/logout', memberController.logout);

// 避免404畫面出現
router.all('*', async (req, res) => {
  await req.flash('errorMessages', '無效的連結！');
  res.redirect('/');
});

module.exports = router;
