-- Insert new row into assignments table
    INSERT INTO assignments 
        (title, priority, subject, duedate, description) 
    VALUES 
        (?, ?, ?, ?, ? );