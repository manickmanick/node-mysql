const db = require("../db")
const { Validator } = require('node-input-validator');
const {encrypt,decrypt,sendActivationEmail} = require("../helper")
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const moment = require('moment');
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

            // return res.status(200).json(sendActivationEmail())
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

              const activationToken = crypto.randomUUID();
              console.log(activationToken);
              const activationExpires = moment().add(10, 'seconds').format('YYYY-MM-DD HH:mm:ss');

              const sql = `INSERT INTO user (name, email, phone, countryCode, password,status,activation_token,activation_expires) VALUES (?, ?, ?, ?, ?,'pending',?,?)`;

              db.passData(sql,[name,email,encryptedPhone,countryCode,hashedPassword,activationToken,activationExpires],async function(obj){
                if(obj.status == "error"){
                    return res.status(500).json({error: obj.message || "Database error"})
                }else{
                    let result = await sendActivationEmail(activationToken)
                    if(result.status == "error"){
                        let sqlDeleteQuery = 'DELETE FROM user WHERE email = ?'
                        db.passData(sqlDeleteQuery,[email],function(obj){
                            if(obj.status == 'error') res.status(500).json({message:'Internal server error',status:'error'})
                        })
                        res.status(500).json({message:'Internal server error while sending email',status:'error'})
                    } 
                    return res.status(200).json({ success: 1, message:result.message });
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

              const sql = 'SELECT id,name,email,password FROM user WHERE email = ? AND status = "activated"'

              db.passData(sql,[email],async function(obj){
                 if(obj.status == "error"){
                    return res.status(500).json({error: obj.message || "Database error"})
                 }else if(obj.status == "success" && obj.result.length == 0){
                    return res.status(200).json({status:"valid",message:`User was not found or not activated with this email : ${email}`})
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
    },
    accountActivation:async (req,res)=>{
        try {

            const { token } = req.params;
            const query = `SELECT * FROM user WHERE activation_token = ? AND activation_expires > NOW()`;
            db.passData(query, [token], async (obj) => {
                if (obj.status == "error") return res.status(500).json({ message: 'Database error', error: err });

                if (obj.result.length === 0) return res.status(400).json({ message: 'Invalid or expired token' });

                const updateQuery = `UPDATE user SET status = 'activated', activation_token = NULL, activation_expires = NULL WHERE activation_token = ?`;
                db.passData(updateQuery, [token], (obj) => {
                    if (obj.status == "error") return res.status(500).json({ message: 'Database update error', error: obj.errors });

                    return res.json({ message: 'Account activated successfully!' });
                });
            });

        } catch (error) {
            console.error("accountActivation Error:", error);
            return res.status(500).json({ status: "error", message: "Internal server error" });
        }
    },
    resendActivationLink:async (req,res)=>{
        try {

            const { email } = req.body;
            const query = `SELECT * FROM user WHERE email = ? AND status = 'pending'`;
            db.passData(query,[email],function(obj){
                if(obj.status == "error") return res.status(500).json({ message: 'Database error',status:"error" });
                if (obj.result.length === 0) return res.status(200).json({ message: 'User not found or already activated' });
                else{
                    const newToken = crypto.randomUUID();
                    const newExpires = moment().add(15, 'minutes').format('YYYY-MM-DD HH:mm:ss');
                    const updateQuery = `UPDATE user SET activation_token = ?, activation_expires = ? WHERE email = ?`;
                    db.passData(updateQuery,[newToken,newExpires,email],async function(obj){
                        if(obj.status == "error") return res.status(500).json({ message: 'Database error',status:"error" });
                        else{
                            let result = await sendActivationEmail(newToken);
                            if(result.status == "error") return res.status(500).json({status:'error',message:'Error occured while sending reactivation link'})
                             else{
                               return res.status(200).json({status:'success',message:'Reactivation link was sent successfully'})
                            }   
                        }
                    })
                }
            })
        } catch (error) {
            console.log(error);
            return res.status(500).json({status:"error",message:"Internal server error"})
        }
    }
}