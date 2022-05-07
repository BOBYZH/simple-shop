const productController = {
  getProducts: (req, res) => {
    if (req.session.userName) {
      // 有登入時顯示會員名稱
      res.render('index', { userName: req.session.userName });
    } else {
      res.redirect('/signin');
    }
  }
};

module.exports = productController;
