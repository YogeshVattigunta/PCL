CREATE TABLE students (
    usn_no TEXT PRIMARY KEY,
    student_name TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    marks_received INTEGER NOT NULL,
    pass_fail_status BOOLEAN DEFAULT FALSE
);

