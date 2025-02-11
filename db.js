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
                connection.release();
                if (error) {
                    return cb({ status: "error", message: error.message });
                }
                cb({status:"success",message:"",result:results})
            })
        })
    } catch (error) {
         cb({status:"error",message:error.message,result:[]})
    }

}

module.exports.runTransaction = (queries, cb) => {
    connection.getConnection((err, connection) => {
        if (err) {
            cb({ status: "error", message: "Database connection failed" });
            return;
        }

        connection.beginTransaction((err) => {
            if (err) {
                connection.release();
                cb({ status: "error", message: "Transaction start failed" });
                return;
            }

            let results = [];

            const executeQuery = (index) => {
                if (index >= queries.length) {
                    connection.commit((err) => {
                        if (err) {
                            connection.rollback(() => {
                                connection.release();
                                cb({ status: "error", message: "Transaction commit failed" });
                            });
                        } else {
                            connection.release();
                            cb({ status: "success", result:results });
                        }
                    });
                    return;
                }

                const { query, data } = queries[index];
                connection.query(query, data, (error, result) => {
                    if (error) {
                        connection.rollback(() => {
                            connection.release();
                            cb({ status: "error", message: "Transaction failed", error: error.message });
                        });
                        return;
                    }

                    results.push(result);
                    executeQuery(index + 1);
                });
            };

            executeQuery(0);
        });
    });
};
