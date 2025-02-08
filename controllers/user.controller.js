const db = require("../db")
const { Validator } = require('node-input-validator');
const {encrypt,decrypt} = require("../helper")
const bcrypt = require('bcrypt');
// user table

// CREATE TABLE person (
//     id INT PRIMARY KEY AUTO_INCREMENT,
//     name VARCHAR(100) NOT NULL,
//     email TEXT NOT NULL,
//     phone TEXT NOT NULL,
//     countryCode VARCHAR(5) NOT NULL,
//     password VARCHAR(255) NOT NULL,
//     createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
// );



module.exports = {
    register:async (req,res)=>{
        try {
            let {name,email,password,phone,countryCode} = req.body;

            const v = new Validator({name,email,password,phone,countryCode}, {
                name: 'required|string|minLength:3|maxLength:100',
                email: 'required|email',
                phone: 'required|numeric|minLength:10|maxLength:15',
                countryCode: 'required|numeric|minLength:1|maxLength:5',
                password: 'required|string|minLength:6'
            });
            
              let isMatched = await v.check();
            
              if(!isMatched){
                console.log(await v.errors);
                return res.status(400).json({status:"invalid",message:"invalid data"})
              }
              const encryptedEmail = encrypt(email);
              const encryptedPhone = encrypt(phone);

              const hashedPassword = await bcrypt.hash(password, 10);

              const sql = `INSERT INTO user (name, email, phone, countryCode, password) VALUES (?, ?, ?, ?, ?)`;

              db.passData(sql,[name,encryptedEmail,encryptedPhone,countryCode,hashedPassword],function(obj){
                if(obj.status == "error"){
                    return res.status(500).json({error: obj.message || "Database error"})
                }else{
                    return res.status(200).json({ success: 1, data: obj.result || {} });
                }
              });

        } catch (error) {
            console.log(error);
            return res.status(500).json({status:"error",message:"Internal server error"})
        }
    }
}