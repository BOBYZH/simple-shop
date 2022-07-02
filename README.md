# simple-shop(簡易電商網站)
## Demo(展示版)測試資訊
- 商店主題與圖文來源：[寶可夢系列的精靈球](https://wiki.52poke.com/zh-hant/%E7%B2%BE%E9%9D%88%E7%90%83)
- 展示網址：[https://simple-shop-expressjs-mariadb.herokuapp.com/](https://simple-shop-expressjs-mariadb.herokuapp.com/)
- 測試用帳密：

| # | email | password |
|---- | ----  | ----  |
| 1 | member1@example.com | 12345678 |  
| 2 | member2@example.com | 12345678 |

- 模擬付款需要開通[行動支付](https://pay.line.me/portal/tw/main)功能的LINE帳號，在電腦登入或從手機掃描條碼進行(不會實際扣款，可以放心「買爆」？)

## 開發緣由
- 從[個人2020年ALPHA Camp畢業專案](https://github.com/BOBYZH/not-citiesocial)的電商網站為發想
- 仍以[express.js](https://expressjs.com/zh-tw/) + [ejs](https://ejs.co/)為主的全端技術開發，
- 但資料庫改用開源免費的[mariaDB](https://mariadb.org/)，且不使用ORM
- 直接使用原生SQL語法操作資料庫
- 同樣以[mocha+chai+supertest+sinon+nyc](https://medium.com/@stupidcoding/%E5%9C%A8node-js%E5%AF%AB%E6%B8%AC%E8%A9%A6-mocha-chai%E6%96%B7%E8%A8%80%E5%BA%AB-supertest%E6%A8%A1%E6%93%AC%E9%80%A3%E7%B7%9A-sinon%E6%9B%BF%E8%BA%AB-nyc%E7%B5%B1%E8%A8%88%E8%A6%86%E8%93%8B%E7%8E%87-f736c423b893)提供完整單元測試
- 且搭配[Github Actions](https://docs.github.com/cn/actions) + [Heroku](https://www.heroku.com/platform)實現CI/CD
- 專案程式碼使用[semistandard](https://ithelp.ithome.com.tw/articles/10241920)維持coding style

[![js-semistandard-style](https://raw.githubusercontent.com/standard/semistandard/master/badge.svg)](https://github.com/standard/semistandard)

## 功能介紹
(WIP)
