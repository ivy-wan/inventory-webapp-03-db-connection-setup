# Part 03: Database Layer: Database connection and first table set-up

This tutorial follows after:
[Part 02: Web app server setup and basics](https://github.com/atcs-wang/inventory-webapp-02-app-server-basics)


> This tutorial assumes familiarity with basic SQL concepts and commands.

Technologies: [MySQL](https://www.mysql.com/), Node's [mysql2 library](https://www.npmjs.com/package/mysql2) and [dotenv library](https://www.npmjs.com/package/dotenv)

The third layer of a web app is the **database**. In this tutorial,  use Node's `mysql2` library to write several scripts to interact with the database, including the following:

1. set up a connection to your MySQL database. 
2. (re-)create tables for the data of our web app
3. (re-)populate the tables with sample data
4. query and print the table's contents.

Strictly speaking, we could do steps 2-4 without using NodeJS scripts. However, writing these scripts will accomplish two things: A) give us practice and understanding of how our web server will interact with the database going forward, and B) create an easy-to-use database initialization process that can be re-applied whenever the database needs to be refreshed or migrated.
## (3.0) Getting prepared
A few things to do before we begin:

1. Install `mysql2` with npm. In the terminal, run this command:
    ```
    > npm install mysql2
    ```

    > The NodeJS package [`mysql2`](https://www.npmjs.com/package/mysql2) is a slightly more modern successor to the original [`mysql` library](https://github.com/mysqljs/mysql#readme). The original `mysql` library is still popular and usable, but it only offers the `query()` method, not the `execute()` method which does true prepared statements. 

2. Create a new subdirectory (folder) called `db` in the root directory of your webapp project. We will place all our NodeJS scripts we write in this tutorial into this subdirectory.

    > Each SQL statement we write and use in our Node scripts can also be found in an `.sql` file in the subdirectory `db/queries/init`.

3. Although not strictly necessary for this tutorial, its also highly recommended that you install an SQL client like MySQL Workbench to work with your database. 

    > Have the SQL client running side-by-side with your IDE as you develop. It can be used to test-run any of the SQL queries you are writing, and to generally design and manage your database. It will particularly be useful in this tutorial to check the success of your scripts after each step.

## (3.1) Setting up a connection (`db_connection.js`)

You will need access to your local or remote MySQL server, with user permissions to create tables in and make queries to a schema - most likely provided to you by the admin of said database server (say, your teacher or boss).

In many cases, the admin will have created a schema for you to use as well. If you need to create a schema yourself (and have user permissions to do so), you can create a schema named `hw_manager` via your SQL client with this line:

```sql
CREATE SCHEMA hw_manager;
```

Make sure you know:
- the database server's **hostname**
- the databases server's **port** (mostly likely 3306), your 
- your database **schema's name** 
- your **username** and **password**.

### (3.1.1) Setting up a database connection with NodeJS's mysql2 library (`db_connection.js`)

We first need our NodeJS app to make a connection to the database so it can send queries. 

Add a new file to the `db` subdirectory called `db_connection.js`. Put in the following code, replacing the `"<...>"` strings with the connection information for your database instance and schema. (Don't include the `<` and `>` characters)

```js
const mysql = require('mysql2');

const dbConfig = {
    host: "<hostname>",
    port: 3306,
    user: "<username>",
    password: "<password>",
    database: "<schema>",
    connectTimeout: 10000
}

const connection = mysql.createConnection(dbConfig);

module.exports = connection;
```

> **WARNING: Plaintext passwords are bad! Don't push your code to Github yet!** We'll fix this security flaw at the end of this section (step 3.1.3). If it's really bothering you right now, you can skip ahead to that section and come back.

This code prepares a database `connection`, configured by the settings in `dbConfig`. But simply creating the `connection` object doesn't actually *connect* to the database yet - that  happens once we actually execute queries.

Since no actual querying happens in this file, it isn't meant to be run on its own (try running `> node db/db_connection.js` and you'll be disappointed). Rather, this is meant to be used as a **module** that can be imported into other parts of the project. Note the last line:

```js
module.exports = connection;
```

This means that if another file uses `require()` like this:

```js
const db = require('<./relative/path/to/db_connection>');
```

then the variable `db` refers to the `connection` object from `db_connection.js`. 

> Even if multiple files in the Node project `require` the same module, the code in that module will only be run once per runtime. So, we can have multiple files utilize the same database connection that is set up only once. Neat!

### (3.1.2) Testing the database connection (`db_test.js`)

Let's test out our connection configuration by actually sending a query to your database to execute.

Make another file in the `db` folder called `db_test.js`, with this code inside:

```js
const db = require("./db_connection");

// Execute query, print results or error 
db.execute('SELECT 1 + 1 AS solution', 
    (error, results) => {
        if (error)
            throw error;
        console.log(results);
    }
);

//Optional: close the connection after query queue is empty.
db.end();
```

> The first line imports the configured connection from `db_connection.js`; since the two files are in the same folder, the relative path for the `require` statement starts with `./`.

Try running this script in the terminal:
```
> node db/db_test.js
```

If you see an error message, double check in `db_connection.js` that the `dbConfig` object's settings are correct. Otherwise, you should see this output:
```
[ RowDataPacket { solution: 2 } ]
```

This demonstrates the basic usage of the `execute()` method: the first parameter is an SQL statement to be executed, and its last (optional) parameter is a **callback function** that handles the eventual results (or error). For a SELECT statement, the results always come back as an **array** of RowDataPacket **objects**, who have **properties** matching the names of the selected **columns**. (The results of other kinds of statements will have different formats and information). 

The concluding `end()` method closes the connection *after* all queued queries have been executed and handled. Without this statement, the connection remains open and the program does not terminate automatically (you can still, of course, manually terminate with `Ctrl-C`).

> Note that `execute` and `end` (and all other connection methods) are *asynchronous* operations: calling them queues a *future* operation, but they do not block. Try adding `console.log()` statements  after both of the `execute` and `end` method calls to see what order things happen in. 
>
> The [npm documentation for the original `mysql` library](https://github.com/mysqljs/mysql#readme) has a similar introduction to its usage, plus more in-depth documentation. Even though we're actually using `mysql2` library, the main ideas are the same.

Although we will not use or update `db/db_test.js` any more in the tutorials, you may find it useful in the future to verify at any point that your database credentials are valid and a connection can be made.

### (3.1.3) Protecting sensitive strings with environment variables and `dotenv`

Before we can push any of our code to Github, we need to deal with an issue: our database password (and other sensitive database information) is sitting in plaintext in `db_connection.js`. This is a clear security flaw, and publishing our code is out of the question until we deal with it.

The standard way to store sensitive configuration data is via **environment variables**, which are global variables for your computer. These can be set via your computer's operating system settings, and are accessible to Node via the `process.env` object.

However, dealing with environment variables is a bit of a hassle, especially if you have several different Node projects that all try to use them. A more convenient option is provided by the `dotenv` package, which sets project-specific values for environment variables from a local text file called `.env`. 

Install `dotenv` with this command:

```
> npm install dotenv
```

Then add these two lines to the top section of `db_connection.js`:

```js
const dotenv = require('dotenv');

dotenv.config();
```

Next, update the `dbConfig` object to this instead:
```js
const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || "10000")
}
```
> Note the OR statements (`||`) are being used to provide a few default options - just in case certain environment variables are not specified.

Next, create a file called `.env` in the root directory of your project. The contents should look like this:

```
# MySQL Database configuration
DB_HOST=<hostname>
DB_PORT=3306
DB_USER=<username>
DB_PASSWORD=<password>
DB_DATABASE=<schema>
DB_CONNECT_TIMEOUT=10000
```

As before, replace the `<...>`  with the connection information for your database instance and schema. 

> *Do NOT include the surround quotation marks or the `<``>` symbols*)

Finally - ***and most crucially*** - add to your `.gitignore` file this line: 
```
.env
```

Now, you can easily set your database configuration settings in the `.env` file without worrying about exposing it via Github. 

However, anyone cloning or forking of your git repository will need to make their own `.env` file. (You'll notice that this tutorials' Git repo does not have a `.env` either...) Therefore, it is common to create and upload a `.sample-env` file that contains the names of the necessary environment variables, but not the values. This can be safely shared with the rest of the project, and provide a starting point for a new `.env` file.

## (3.2) Table creation (`db_create.js`)

Now that we've tested our database connection, let's use the connection to create two tables for our web app's data: an `assignments` table and a `subjects` table! 

We'll write a short utility script called `db_create.js` that we can run at any time to (re-)create the table. 

> If you prefer to design and create your tables purely using an SQL client, you could theoretically opt to skip this section (3.2) and start from section (3.3) instead, not writing `db_create.js` at all.
> 
> However, as noted at the start, having a script that encapsulates the creation process for your database can be quite useful to have in the future (in case its lost, need for migration, etc.). 

Create a new file in the `db` folder called `db_create.js`, and add this line at the top:

```js
const db = require("./db_connection");
```


### (3.2.1) DROP the existing tables
First, we want to run some SQL that deletes the old tables if they already exist. Add this code to `db_create.js`:

```js
/**** Drop existing tables, if any ****/

const drop_assignments_table_sql = "DROP TABLE IF EXISTS assignments;"

db.execute(drop_assignments_table_sql);

const drop_subjects_table_sql = "DROP TABLE IF EXISTS subjects;"

db.execute(drop_subjects_table_sql);

```

*(these queries can be also found in `/db/queries/init/drop_assignments_table.sql` and `/db/queries/init/drop_subjects_table.sql`)*

### (3.3.2) CREATE the tables

Based on our prototypes, the app needs to manage records of both a list of "subjects" and a list of "assignments". These could be stored in two tables with the following columns:

Table **`subjects`**:
- **subjectId** (int) [NOT NULL] {Primary Key}
- **subjectName** (short string) [NOT NULL]

Table **`assignments`**:
- **assignmentId** (int) [NOT NULL] {Primary Key}
- **title** (short string - max 45 chars) [NOT NULL]
- **priority** (int) 
- **subjectId** (int) [NOT NULL] {Foreign Key referencing `subjects.subjectId`}
- **dueDate** (date) 
- **description** (long string - max 150 chars)

> Note that both tables have an integer **id** as their primary key, rather using `subjectName` or `title` as the primary key. This is because it should be possible to have multiple assignments with the same title, or subjects with the same name - especially once there are multiple users who will have their own subjects and assignments.  

To create such tables, the following SQL statements could be run: *(also in `/db/queries/init/create_subjects_table.sql` and `/db/queries/init/create_assignments_table.sql`)*:
```sql
CREATE TABLE subjects (
  subjectId INT NOT NULL AUTO_INCREMENT,
  subjectName VARCHAR(45) NOT NULL,
  PRIMARY KEY (subjectId));

CREATE TABLE assignments (
  assignmentId INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(45) NOT NULL,
  priority INT NULL,
  subjectId INT NOT NULL,
  dueDate DATE NULL,
  description VARCHAR(150) NULL,
  PRIMARY KEY (assignmentId),
  INDEX assignmentSubject_idx (subjectId ASC),
  CONSTRAINT assignmentSubject
    FOREIGN KEY (subjectId)
    REFERENCES subjects (subjectId)
    ON DELETE RESTRICT
    ON UPDATE CASCADE);

```

It's likely you don't have the syntax for `CREATE TABLE` memorized. That's fine! You can use MySQL Workbench or another tool to manually design the tables (including specifying the foreign keys), and then just copy the generated SQL.

> NOTE: because `assignments` defines a foreign key constraint referencing `subjects`, we must `CREATE` the `subjects` table before the `assignments` table. 
>
> Conversely, this also means that we must `DROP` the `assignments` table before the `subjects` table.

Now let's add some code to `db_create.js` to execute the table-creating SQL query:

```js
/**** Create tables ****/

const create_subjects_table_sql = `
    CREATE TABLE subjects (
        subjectId INT NOT NULL AUTO_INCREMENT,
        subjectName VARCHAR(45) NOT NULL,
        PRIMARY KEY (subjectId));
`
db.execute(create_subjects_table_sql);

const create_assignments_table_sql = `
    CREATE TABLE assignments (
        assignmentId INT NOT NULL AUTO_INCREMENT,
        title VARCHAR(45) NOT NULL,
        priority INT NULL,
        subjectId INT NOT NULL,
        dueDate DATE NULL,
        description VARCHAR(150) NULL,
        PRIMARY KEY (assignmentId),
        INDEX assignmentSubject_idx (subjectId ASC),
        CONSTRAINT assignmentSubject
            FOREIGN KEY (subjectId)
            REFERENCES subjects (subjectId)
            ON DELETE RESTRICT
            ON UPDATE CASCADE);
`

db.execute(create_assignments_table_sql);
```

Finally, add this line to close the connection and end the script.

```js
db.end();
```

### (3.2.3) Run and check `db_create.js`

Our table creation script `db_create.js` is done! You can run it with:

```
> node db/db_create.js
```

If you get any errors in the output, go back and double check your code.

> You can check the success of your table creation by using your SQL client to view the structure of your newly created tables. Double check that the columns and foreign keys are all properly set.

Anytime you run this script again, it'll first remove the old versions of these tables, then re-create them.

## (3.3) (Re-)Populate the table with sample data (`db_insert_sample_data.js`)

Once the tables are created, we'd like to insert some sample data into our tables, just to get things started.

Create a new file in the `db` folder called `db_insert_sample_data.js`, and add the `require` line at the top:

```js
const db = require("./db_connection");
```
### (3.3.1) DELETE table *contents* 

If the table already has data in it, we would like to clear it's contents before populating it with sample data.

Add these lines to `db_insert_sample_data.js`

```js
/**** Delete *CONTENTS OF* existing tables (but not dropping tables themselves) ****/

const delete_assignments_table_sql = "DELETE FROM assignments;"

db.execute(delete_assignments_table_sql);

const delete_subjects_table_sql = "DELETE FROM subjects;"

db.execute(delete_subjects_table_sql);
```

*(these queries can be also found in `/db/queries/init/delete_assignments_table.sql` and `/db/queries/init/delete_subjects_table.sql`)*

> The foreign key constraint's `ON DELETE RESTRICT` makes it necessary to DELETE `assignments` before `subjects`.

### (3.3.2) INSERT sample data to populate the tables

We can begin by inserting the subjects and assignments that you see in the `assignments.html` prototype page. 

To do so, we *could* execute a series of INSERT queries like these to insert rows into `subjects`:

```sql
INSERT INTO subjects 
    (subjectId, subjectName) 
VALUES 
    (1, 'Comp Sci');

-- And similarly:
INSERT INTO subjects (subjectId, subjectName) VALUES (2, 'Math');
INSERT INTO subjects (subjectId, subjectName) VALUES (3, 'Language');
INSERT INTO subjects (subjectId, subjectName) VALUES (4, 'Music');
```

followed by these queries to insert rows into `assignments`:

```sql
INSERT INTO assignments 
    (title, priority, subjectId, dueDate, description) 
VALUES 
    ('Textbook Exercises', 10, 2, '2023-26-05', 
        'Do odd questions in the range #155 - #207 (chapter 11). Remember to show your work!');
-- And similarly
INSERT INTO assignments (title, priority, subject, dueDate, description) 
    VALUES  ('Long Form Essay', 8, 3, '2023-06-01', null);
INSERT INTO assignments (title, priority, subject, dueDate, description) 
    VALUES  ('Web App Project', 5, 1, '2023-06-01', null);

```

> Note how the `assignments.subjectId` value match the appropriate `subject.subjectId` for their subject, since `assignments.subjectId` has a foreign key relationship with `subject.subjectId`.
>
> When inserting into `assignments`, we don't bother specifying the `assignmentId` because that column has `AUTO INCREMENT` which will give an appropriate value automatically.
> However, although  `subjects.subjectId` also has `AUTO INCREMENT`, we explicitly set the `subjectId` value when inserting into `subjects` to make sure we know what to use for  `assignments.subjectId`. 

However, the queries above are largely repetitive, following a similar pattern for each table; the only differences in the queries are the values being inserted.

Instead of writing such similar looking queries, we can write two general queries with question mark **placeholders** (`?`) for values.

Here's one for `assignments` inserts *(also in `/db/queries/init/insert_subject.sql`)*:

```sql
INSERT INTO subject 
    (subjectId, subjectName) 
VALUES 
    (?, ?);
```

And here's one for `assignments` inserts *(also in `/db/queries/init/insert_assignment.sql`)*:

```sql
INSERT INTO assignments 
    (title, priority, subjectId, dueDate, description) 
VALUES 
    (?, ?, ?, ?, ? );    
```

The `execute()` method then offers a handy way to replace those `?` placeholds with actual values before executing: simply pass an array of values as the optional second parameter, and each value will be used to replace a `?`. This is a technique called **"prepared statements"**, and it allows us to re-use general queries.

Add this code to `db_init.js` to perform the queries above using prepared statements:

```js
/**** Create some sample subjects and assignments ****/

const insert_subject_sql = `
    INSERT INTO subjects 
        (subjectId, subjectName) 
    VALUES 
        (?, ?);
`

db.execute(insert_subject_sql, [1, 'Comp Sci']);

db.execute(insert_subject_sql, [2, 'Math']);

db.execute(insert_subject_sql, [3, 'Language']);

db.execute(insert_subject_sql, [4, 'Music']);


const insert_assignment_sql = `
    INSERT INTO assignments 
        (title, priority, subjectId, dueDate, description) 
    VALUES 
        (?, ?, ?, ?, ? );
`

//subjectId: 2 => 'Math'
db.execute(insert_assignment_sql, ['Textbook Exercises', 10, 2, '2023-05-26', 
        'Do odd questions in the range #155 - #207 (chapter 11). Remember to show your work!']);

//subjectId: 3 => 'Language'
db.execute(insert_assignment_sql, ['Long Form Essay', 8, 3, '2023-06-01', null]);

//subjectId: 1 => 'Comp Sci'
db.execute(insert_assignment_sql, ['Web App Project', 5, 1, '2023-06-07', null]);

```

A few important notes to ensure valid, error-free inserts:
- We can insert a `null` value, but only for the columns that we indicated as `NULL` (as opposed to the required data which were `NOT NULL` ).
- For columns with a foreign key constraint, we can only insert values that match the referenced table column. So `assignments.subjectId` can only be given values already in `subjects.id`.
- The standard format for MySQL DATE values is `yyyy-mm-dd`. 
    - If we wish to insert it using a different format, we could use the `STR_TO_DATE` MySQL function. Read the (STR_TO_DATE documentation here)[https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_str-to-date])


The above statements only added items that were in the prototype pages. However, we can easily insert some additional subjects and assignments too. (This will be good preparation for the next tutorial.)

Add some more code to `db_init.js`, calling `db.execute` with prepared statements to create more subjects and assignments, like this:

```js
/**** Create some additional subjects and assignments that aren't in the prototypes ****/

db.execute(insert_subject_sql, [5, 'Biology']);

db.execute(insert_subject_sql, [6, 'History']);

//subjectId: 1 => 'Comp Sci'
db.execute(insert_assignment_sql, ['Recursion Lab', 7, 1, '2023-05-23', 'Partner optional']);

//subjectId: 4 => 'Music'
db.execute(insert_assignment_sql, ['Practice!', 1, 4, null, 'Every day :)']);

//subjectId: 5 => 'Biology'
db.execute(insert_assignment_sql, ['Cell Function Research Paper', null, 5, '2023-06-06', null]);

//subjectId: 6 => 'History'
db.execute(insert_assignment_sql, ['Watch WWII docuseries on PBS', null, 6, null, 'Technically optional, but actually looks interesting']);

```

> Using prepared statements also helps protect against potential SQL injection attacks. This only becomes relevant when we're inserting user-provided values, but you can read more here if you like: https://stackoverflow.com/questions/8263371/how-can-prepared-statements-protect-from-sql-injection-attacks

Finally, add this line to close the connection and end the script.

```js
db.end();
```

### (3.3.3) Run and check `db_insert_sample_data.js`

Our sample data insertion script `db_insert_sample_data.js` is done! You can run it with:

```
> node db/db_insert_sample_data.js
```

If you get any errors in the output, go back and double check your code.

> You can check the success of your insertions by using your SQL client to view the contents of your tables. Double check that the values are correct and in the right columns.

## (3.4) Query and print the contents of the tables (`db_print.js`)

Finally, after creating the tables and populating them with sample data, it would be nice to check out their final contents. 

Create a new file in the `db` folder called `db_print.js`, and add the `require` line at the top:

```js
const db = require("./db_connection");
```

### (3.4.1) SELECT the `subjects` table and print results

To see the list of subjects, this is easily done with this statement *(also in `/db/queries/init/select_subjects.sql`)*:

```sql
SELECT * FROM subjects;
```

As we did in the `db_test.js`, let's add code to `db_print.js` to execute the query and provide a callback function to print out the results. 
```js

/**** Read the subjects table ****/

const select_subjects_sql = "SELECT * FROM subjects";

db.execute(select_subjects_sql, 
    (error, results) => {
        if (error) 
            throw error;

        console.log("Table 'subjects' contents:")
        console.log(results);
    }
);

```
### (3.4.2) SELECT the `assignments` table (joined with `subjects`) and print results

Now we'd like to see the list of assignments. This could be done similarly with:

```sql
SELECT * FROM assignments;
```

However, since the assignments don't include the subject names explicitly (they only have `subjectId`, a foreign key referencing `subject.subjectId`), we might like to `JOIN` the `assignments` table with the `subjects` to see each assignment matched with their associated `subjectName`.

This can be done with this statement *(also in `/db/queries/init/select_assignments.sql`)*:

```sql
SELECT *
FROM assignments
JOIN subjects
    ON assignments.subjectId = subjects.subjectId
ORDER BY
    assignments.assignmentId;
```

Notice that there is an explicit ordering by `assignments.assignmentId` (otherwise it will be ordered by `subjectId`)

As we did in the `db_test.js`, let's make the query and provide a callback function to print out the results. 

```js
/**** Read the assignments table, joined with subjects table ****/


const select_assignments_sql = `
SELECT *
FROM assignments
JOIN subjects
    ON assignments.subjectId = subjects.subjectId
ORDER BY
    assignments.assignmentId;
`;

db.execute(select_assignments_sql, 
    (error, results) => {
        if (error) 
            throw error;

        console.log("Table 'assignments' contents:")
        console.log(results);
    }
);
```

Finally, add this line to close the connection and end the script.

```js
db.end();
```

Our select-and-print script is done! You can run it with:
```
> node db/db_print.js
```

If you get any errors in the output, go back and double check your code.

If it all runs smoothly, you should see something like this output:

```js
Table 'subjects' contents:
[
  { subjectId: 1, subjectName: 'Comp Sci' },
  { subjectId: 2, subjectName: 'Math' },
  { subjectId: 3, subjectName: 'Language' },
  { subjectId: 4, subjectName: 'Music' },
  { subjectId: 5, subjectName: 'Biology' },
  { subjectId: 6, subjectName: 'History' }
]
Table 'assignments' contents:
[
  {
    assignmentId: 1,
    title: 'Textbook Exercises',
    priority: 10,
    subjectId: 2,
    dueDate: 2023-05-26T04:00:00.000Z,
    description: 'Do odd questions in the range #155 - #207 (chapter 11). Remember to show your work!',
    subjectName: 'Math'
  },
  {
    assignmentId: 2,
    title: 'Long Form Essay',
    priority: 8,
    subjectId: 3,
    dueDate: 2023-06-01T04:00:00.000Z,
    description: null,
    subjectName: 'Language'
  },
  {
    assignmentId: 3,
    title: 'Web App Project',
    priority: 5,
    subjectId: 1,
    dueDate: 2023-06-07T04:00:00.000Z,
    description: null,
    subjectName: 'Comp Sci'
  },
  {
    assignmentId: 4,
    title: 'Recursion Lab',
    priority: 7,
    subjectId: 1,
    dueDate: 2023-05-23T04:00:00.000Z,
    description: 'Partner optional',
    subjectName: 'Comp Sci'
  },
  {
    assignmentId: 5,
    title: 'Practice!',
    priority: 1,
    subjectId: 4,
    dueDate: null,
    description: 'Every day :)',
    subjectName: 'Music'
  },
  {
    assignmentId: 6,
    title: 'Cell Function Research Paper',
    priority: null,
    subjectId: 5,
    dueDate: 2023-06-06T04:00:00.000Z,
    description: null,
    subjectName: 'Biology'
  },
  {
    assignmentId: 7,
    title: 'Watch WWII docuseries on PBS',
    priority: null,
    subjectId: 6,
    dueDate: null,
    description: 'Technically optional, but actually looks interesting',
    subjectName: 'History'
  }
]
```

Again, note the format of the results from the `SELECT` queries : an **array** of RowDataPacket **objects**, who have **properties** matching the names of the  **columns**. 

> You might notice that `dueDate` properties include both date and time information. This is a JavaScript `Date` object. 
> If we want instead a *string* in a particular format, we can use the `DATE_FORMAT` SQL function (read the (DATE_FORMAT documentation here)[https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-format])


## (3.5) OPTIONAL: Read SQL files instead of using string literals

You might be a bit turned off by having SQL embedded as plain strings into our JavaScript code. We did this for ease of usage and understanding while using the `mysql2` library for the first time, but you may eventually prefer to keep the two kinds of languages separate and in their respective file types (`.js` and `.sql`). If you want to do so now, you can change the JS to instead read the SQL from the `.sql` files in the `/db/queries/init/` subdirectory. 

To do so, we can use the built-in Node module `fs` (which doesn't need installing). Simply add this to the top of each script: 

```js
const fs = require("fs");
```

and then you can rewrite each variable that holds an SQL statement in a string literal, instead calling `fs.readFileSync(...)` to read the appropriate file.

For example:
```
const drop_assignments_table_sql = fs.readFileSync(__dirname + "/db/queries/init/drop_assignments_table.sql", { encoding: "UTF-8" });
```

## (3.7) Conclusion:

We've set up our data layer as a MySQL database, set up a connection from NodeJS, and wrote scripts that create, populate, and print the data tables that our webapp will use.

With the basics of all three layers in place, it's finally time to connect them! Next, we'll transform our static prototypes into dynamic web pages, rendered by the app server from live data stored in the database.
