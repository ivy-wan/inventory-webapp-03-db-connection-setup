-- Select all rows of assignments table, along with related info from
SELECT *
FROM assignments
JOIN subjects
    ON assignments.subjectId = subjects.id
ORDER BY
    assignments.assignmentId;