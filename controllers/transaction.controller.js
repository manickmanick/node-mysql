const crypto = require('crypto');
const moment = require('moment');
const db = require("../db");
const { Validator } = require('node-input-validator');
const { sendEmail } = require('../helper');

module.exports = {

    transactionRequest:async(req,res)=>{
        try {
            const { amount, type } = req.body; 

            const v = new Validator(req.body, {
                type: 'required|in:deposit,withdrawal',
                amount: 'required|decimal|min:1.0'
            });
        
            const matched = await v.check();
            if (!matched) {
                return res.status(400).json({ message: 'Validation failed', errors: v.errors ,status:'error'});
            }
    
            const userId = req.user.id;
    
            const otp = crypto.randomInt(100000, 999999).toString();
            const otpExpires = moment().add(5, 'minutes').format('YYYY-MM-DD HH:mm:ss');
    
            const query = `INSERT INTO transactions (user_id, amount, type, otp_code, otp_expires, status) VALUES (?, ?, ?, ?, ?, 'pending')`;
    
            db.passData(query,[userId,amount,type,otp,otpExpires],function(obj){
                if(obj.status == "error") return res.status(500).json({message:'internal server error',status:'error'})
                else{
                   let mailContent = {
                    from:`"Your App" ${process.env.EMAIL}`,
                    to:process.env.TO_EMAIL,
                    subject:'Your OTP Code',
                    text:`Your OTP code is ${otp}. It expires in 5 minutes.`,
                    html:`<p>Your OTP code is <strong>${otp}</strong>. It expires in 5 minutes.</p>`
                   }
                   let mailResult = sendEmail(mailContent);
                   if(mailResult.status == "error"){
                      let deleteTransQuery = "DELETE FROM transactions WHERE otp_code = ?"
                      db.passData(deleteTransQuery,[otp],function(obj){
                        if(mailResult.status == "error") return res.status(500).json({status:"error",message:"Internal server error while deleting the transaction data"})
                        return res.status(200).json({status:"success",message:"Please try again"})
                      })
                   }else{
                        return res.status(200).json({status:"success",message:'OTP was sent to your email',transactionId:obj.result.insertId})
                   }
                }
            })
        } catch (error) {
            console.log(error);
            return res.status(500).json({ status: "error", message: "Internal server error" });
        }
       
    },
    transactionVerify:async (req,res)=>{
        try {

            let {OTP,transId} = req.body
            const v = new Validator(req.body, {
                OTP: 'required|string|digits:6',
                transId: 'required|integer|min:1'
            });
        
            const matched = await v.check();
            if (!matched) {
                return res.status(400).json({ message: 'Validation failed', errors: v.errors ,status:'error'});
            }
            const query = `
                SELECT t.id, t.amount, t.type, t.otp_code, t.otp_expires, u.balance,u.id
                FROM transactions t
                INNER JOIN user u ON t.user_id = u.id
                WHERE t.id = ? 
                AND t.status = 'pending'
            `;
            
            db.passData(query,[transId],async function(obj){
                if(obj.status == "error")   return res.status(500).json({ status: "error", message: "Internal server error" });
                else if (obj.status == "success" && obj.result.length == 0) return res.status(200).json({status:"success",message:"Invalid transaction id"})
                else{
                    let transactionInfo = obj.result[0];

                    if (moment().isAfter(moment(transactionInfo.otp_expires))) {
                        return res.status(400).json({ message: "OTP has expired. Request a new one." });
                    }

                    if(transactionInfo.otp_code != OTP){
                        return res.status(400).json({ message: 'Incorrect OTP',status:'success' });
                    }

                    let newBalance = 0;
                    if(transactionInfo.type == "withdrawal"){
                        let withdrawlAmount = transactionInfo.amount;
                        if(transactionInfo.balance < withdrawlAmount){
                            return res.status(200).json({status:'success',message:'Insufficient balance'})
                        }else{
                            newBalance = transactionInfo.balance - withdrawlAmount;
                        }
                    }else{
                        newBalance = transactionInfo.balance + transactionInfo.amount
                    }

                    const queries = [
                        { query: `UPDATE user SET balance = ? WHERE id = ?`, data: [newBalance, transactionInfo.id] },
                        { query: `UPDATE transactions SET status = 'approved', otp_code = NULL, otp_expires = NULL WHERE id = ?`, data: [transId] }
                    ]

                    db.runTransaction(queries,function(obj){
                        if(obj.status == "error") return res.status(500).json({ status: "error", message: "Internal server error" });
                        else return res.json({ message: "Transaction approved successfully" ,status:"success"});
                    });
                    
                }
            })

        } catch (error) {
            console.log(error);
            return res.status(500).json({ status: "error", message: "Internal server error" });
        }
    }
}