require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const db = require("./src/db/dynamodb");
const serverless = require("serverless-http");
const app = express();
const port = process.env.PORT;

// app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

require("./src/routes")(app, db);

app.listen(port, () => {
  console.log(`Bot running on ${process.env.GW_URL}`);
  console.log("We are live on " + port);
});


module.exports.handler = serverless(app);
