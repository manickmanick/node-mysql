require('dotenv').config()
const express = require("express")
const app = express();
const PORT = process.env.PORT
const mysql = require('mysql');
const routes = require("./router/routes")

app.use(express.json())
app.use("/",routes);

app.listen(PORT,()=>{
    console.log(`server listening on port ${PORT}`);
})