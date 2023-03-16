// (Re)Sets up the database, including a little bit of sample data
const db = require("./db_connection");

/**** This version of the db_init.js file assumes the table already exists, designed in a tool like MySQL Workbench, and you don't want to recreate it ****/

/**** Delete *CONTENTS OF* existing assignments table (but not the table itself) ****/

const delete_assignments_table_sql = "DELETE FROM assignments;"

db.execute(delete_assignments_table_sql);

/**** Create some sample items ****/

/**** Create some sample assignments ****/

const insert_assignment_sql = `
    INSERT INTO assignments 
        (title, priority, subject, dueDate, description) 
    VALUES 
        (?, ?, ?, ?, ? );
`

db.execute(insert_assignment_sql, ['Textbook Exercises', '2', 'Math', '2023-05-26', 
        'Do odd questions in the range #155 - #207 (chapter 11). Remember to show your work!']);

db.execute(insert_assignment_sql, ['Long Form Essay', '8', 'Language', '2023-06-01', 
        'Write about a current event of your choice. 1000 words']);

db.execute(insert_assignment_sql, ['Web App Project', '5', 'Comp Sci', '2023-06-07', null]);

db.execute(insert_assignment_sql, ['Practice!', null, 'Music', null, 'Every day :)']);

/**** Read all assigments in table ****/

const read_assignments_sql = "SELECT * FROM assignments";

db.execute(read_assignments_sql, 
    (error, results) => {
        if (error) 
            throw error;

        console.log("Table 'assignments' initialized with:")
        console.log(results);
    }
);

db.end();


/*

// Alternatively, instead of putting SQL in string literals, read the SQL from files using the "fs" package.
// Put this code at the top, and remove all the SQL string literals defined through the file.
const fs = require("fs");

const delete_assignments_table_sql = fs.readFileSync(__dirname + "/db/queries/init/delete_assignments_table.sql", { encoding: "UTF-8" });
const insert_assignment_sql = fs.readFileSync(__dirname + "/db/queries/init/insert_assignment.sql", { encoding: "UTF-8" });
const read_assignments_sql = fs.readFileSync(__dirname + "/db/queries/init/read_assignments.sql", { encoding: "UTF-8" });

*/

