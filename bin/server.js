require('dotenv').config()
const App = require("../src/server/server");
const port = process.env.APP_PORT || 3000;
App.listen(port);
