const express = require('express');
const router = express.Router();

const memberController = require('../controllers/memberController');
const productController = require('../controllers/productController');
const cartController = require('../controllers/cartController');
const orderController = require('../controllers/orderController');

// 首頁，導向所有商品頁面
router.get('/', (req, res) => {
  res.redirect('/products');
});

// 商品
// 所有商品頁面
router.get('/products', productController.getProducts);
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

// 訂單
// 訂單頁面
router.get('/orders', orderController.getOrders);
// 確認頁面
router.get('/orders/confirm', orderController.confirmPayment);
// 新增訂單
router.post('/order', orderController.postOrder);
// 取消訂單
router.put('/order/:id/cancel', orderController.cancelOrder);
// 付款頁面
router.get('/order/:id/payment', orderController.getPayment);

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
  await req.flash('errorMessages', '系統錯誤，請重新嘗試與檢查購物車！');
  res.redirect('/');
});

module.exports = router;
