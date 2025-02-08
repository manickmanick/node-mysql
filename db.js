const mysql = require("mysql");

var connection = mysql.createPool({
    host     : 'localhost',
    user     : process.env.MYSQL_USER,
    password : process.env.MYSQL_PASSWORD,
    database : process.env.MYSQL_DB
  });
   

module.exports.passData = (query,data,cb)=>{

    try {
        connection.getConnection(async (err,connection)=>{
            if(err) throw err;
            connection.query(query,data,function(error,results){
                if (error) {
                    return cb({ status: "error", message: error.message });
                }
                cb({status:"sucess",message:"",result:results})
            })
        })
    } catch (error) {
         cb({status:"error",message:error.message,result:''})
    }

}

