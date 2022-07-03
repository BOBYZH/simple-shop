# simple-shop(簡易電商網站)
## Demo(展示版)測試資訊
- 商店主題與圖文來源：[寶可夢系列的精靈球](https://wiki.52poke.com/zh-hant/%E7%B2%BE%E9%9D%88%E7%90%83)
- 展示**網址**：[https://simple-shop-expressjs-mariadb.herokuapp.com/](https://simple-shop-expressjs-mariadb.herokuapp.com/)
- **測試用帳密**：

| # | email | password |
|---- | ----  | ----  |
| 1 | member1@example.com | 12345678 |  
| 2 | member2@example.com | 12345678 |

- 模擬付款需要**開通**[**行動支付**](https://pay.line.me/portal/tw/main)功能的**LINE帳號**，在電腦登入或從手機掃描條碼進行(不會實際扣款，可以放心「買爆」？)

## 開發緣由
### 功能簡介
- 從[個人2020年ALPHA Camp畢業專案](https://github.com/BOBYZH/not-citiesocial)的**電商網站**為發想，所製作的Side-project
- 做出功能簡化的MVP(minimum viable product)，只保留客戶端商品瀏覽、簡易會員、購物車與訂單金流的**核心購物功能**
- 且能透過更改環境**變數自定義商店**名稱、圖示、類型與主題(後臺部分則直接使用關聯式資料庫GUI應用程式管理資料)
- 目前定位為給開發人員自行架設管理的小型商店，**快速建立個人少量式樣販售的電商網站**
### 技術特點
- 以[**express.js**](https://expressjs.com/zh-tw/) + [ejs](https://ejs.co/)為主的全端技術開發
- 資料庫採用開源免費的[**MariaDB**](https://mariadb.org/)
- 不使用ORM，**直接使用原生SQL語法操作資料庫**
- 另以[mocha+chai+supertest+sinon+nyc](https://medium.com/@stupidcoding/%E5%9C%A8node-js%E5%AF%AB%E6%B8%AC%E8%A9%A6-mocha-chai%E6%96%B7%E8%A8%80%E5%BA%AB-supertest%E6%A8%A1%E6%93%AC%E9%80%A3%E7%B7%9A-sinon%E6%9B%BF%E8%BA%AB-nyc%E7%B5%B1%E8%A8%88%E8%A6%86%E8%93%8B%E7%8E%87-f736c423b893)**提供完整單元測試**
- 搭配[Github Actions](https://docs.github.com/cn/actions) + [Heroku](https://www.heroku.com/platform)實現**CI/CD**
- 此外，專案程式碼使用[semistandard](https://ithelp.ithome.com.tw/articles/10241920)維持**coding style**統一格式規範

## 功能介紹
(WIP)

## 安裝流程
### 本機安裝
0. 先確定電腦有安裝[node.js](https://nodejs.org/zh-tw/download/)、[git](https://git-scm.com/downloads)、mariaDB
1. 開啟終端機執行指令在個人電腦複製一份本專案：`git clone https://github.com/BOBYZH/simple-shop.git`
2. 將目錄切換至專案資料夾：`cd simple-shop`
3. 使用npm安裝需要的[套件](https://github.com/BOBYZH/simple-shop/blob/main/package.json#L12)：`npm install`
4. 建立環境變數檔，並依個人設定與需求填入：`cp .env.template .env`
5. 建立資料庫與示範用資料：`npm run seed`
6. **若需要測試[LINEPay api](https://pay.line.me/jp/developers/main/main?locale=zh_TW)，請自行辦理測試帳號**，且將變數填入.env檔案，另需[ngrok](https://ngrok.com/)模擬網域
7. 執行本專案：`npm run dev`
8. 開啟預覽連結，預設為[http://localhost:3000](http://localhost:3000)
9. 也可執行單元測試，檢視程式碼的自動化測試結果(**會將資料庫既有資料清空！**)
  - 只包含單元測試：`npm run test`
  - 包含程式碼覆蓋率計算和報告：`npm run cover`(位置："./coverage/index.html")

### 環境變數說明


## 後續可發展方向
