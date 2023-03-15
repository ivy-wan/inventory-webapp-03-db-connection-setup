const db = require("./db_connection");

// Execute query, print results or error 
db.execute('SELECT * from assignments', 
    (error, results) => {
        if (error)
            throw error;
        console.log(Object.prototype.toString.call(results[0].dueDate));
    }
);

//Optional: close the connection after query queue is empty.
db.end();