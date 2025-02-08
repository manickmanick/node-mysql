const db = require("../db")
const { Validator } = require('node-input-validator');
const {encrypt,decrypt} = require("../helper")
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
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
            //   const encryptedEmail = encrypt(email);
              const encryptedPhone = encrypt(phone);

              const hashedPassword = await bcrypt.hash(password, 10);

              const sql = `INSERT INTO user (name, email, phone, countryCode, password) VALUES (?, ?, ?, ?, ?)`;

              db.passData(sql,[name,email,encryptedPhone,countryCode,hashedPassword],function(obj){
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
    },
    getUser:async (req,res)=>{
        try {
            let userId = req.user.id;
            let sql = 'SELECT id,name,email,phone FROM user WHERE id = ?'
            db.passData(sql,[userId],function(obj){
                if(obj.status == "error"){
                    return res.status(500).json({error: obj.message || "Database error"})
                 }else if (obj.result.length == 0){
                    return res.status(200).json("invalid token")
                 }
                 else{
                    let {id,name,email,phone} = obj.result[0];
                    return res.status(200).json({
                        id,
                        name,
                        email,
                        phone:decrypt(phone)
                    })
                 }
            })

        } catch (error) {
            console.log(error);
            return res.status(500).json({status:"error",message:"Internal server error"})
        }
    },
    login:async (req,res)=>{
        try {
            let {email,password} = req.body;
            const v = new Validator({email,password}, {
                email: 'required|email',
                password: 'required|string|minLength:6'
            });
            let isMatched = await v.check();
            
              if(!isMatched){
                console.log(await v.errors);
                return res.status(400).json({status:"invalid",message:"invalid data given"})
              }

              const sql = 'SELECT id,name,email,password FROM user WHERE email = ?'

              db.passData(sql,[email],async function(obj){
                 if(obj.status == "error"){
                    return res.status(500).json({error: obj.message || "Database error"})
                 }else if(obj.status == "success" && obj.result.length == 0){
                    return res.status(200).json({status:"valid",message:`User was not found with this email : ${email}`})
                 }else{
                    let user = obj.result[0];
                    const isMatch = await bcrypt.compare(password, user.password);
                    if (!isMatch) {
                        return res.status(401).json({ error: 'Invalid email or password' });
                    }else{
                        // Generate JWT token
                        const token = jwt.sign({ id: user.id, name: user.name }, process.env.JWT_SECRET, { expiresIn: '1h' });
                        res.json({
                            message: 'Login successful',
                            token,
                            user: {
                                id: user.id,
                                name: user.name,
                                email
                            }
                        });
                    }
                 }
              })

        } catch (error) {
            console.log(error);
            return res.status(500).json({status:"error",message:"Internal server error"})
        }
    },
    update:async(req,res)=>{
        try {
            const { name, phone, countryCode,id } = req.body;
    
            // Validate input
            const v = new Validator({
                name,
                phone,
                countryCode
            }, {
                name: 'required|string|minLength:3',
                phone: 'required|string|minLength:10|maxLength:15',
                countryCode: 'required|string|minLength:1|maxLength:5'
            });
    
            const matched = await v.check();
            if (!matched) {
                console.log(await v.errors);
                return res.status(400).json({ status: "error", message: v.errors });
            }
    
            const encryptedPhone = encrypt(phone);
    
            const sql = `UPDATE user SET name = ?, phone = ?, countryCode = ? WHERE id = ?`;
            db.passData(sql,[name,encryptedPhone,countryCode,id],function(obj){
                if(obj.status == "error"){
                    console.error("Database Error:", err);
                    return res.status(500).json({ status: "error", message: "Database update failed" });
                }

                if (obj.result.affectedRows === 0) {
                    return res.status(404).json({ status: "error", message: "User not found" });
                }

                return res.status(200).json({status:"valid",message:"Data was updated successfully"})

            })
    
        } catch (error) {
            console.error("Update Error:", error);
            return res.status(500).json({ status: "error", message: "Internal server error" });
        }
    }
}