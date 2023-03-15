-- Create the assignments table
CREATE TABLE assignments (
    id INT NOT NULL AUTO_INCREMENT,
    title VARCHAR(45) NOT NULL,
    priority INT NULL,
    subject VARCHAR(45) NOT NULL,
    dueDate DATE NULL,
    description VARCHAR(150) NULL,
    PRIMARY KEY (id)
);