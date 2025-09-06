INSERT INTO college (college_id, name) VALUES ('c1','Test College');

INSERT INTO student (student_id, college_id, name, email, roll_no)
 VALUES ('stu1','c1','Arya H','arya@example.com','R001'),
        ('stu2','c1','Ravi K','ravi@example.com','R002'),
        ('stu3','c1','Neel P','neel@example.com','R003');

INSERT INTO event (event_id, college_id, title, type, starts_at, ends_at, capacity)
 VALUES ('ev1','c1','ML Workshop','Workshop','2025-09-10T09:00:00Z','2025-09-10T12:00:00Z',100),
        ('ev2','c1','Hackathon','Fest','2025-09-12T10:00:00Z','2025-09-12T20:00:00Z',200);

INSERT INTO registration (event_id, student_id, registered_at) VALUES
 ('ev1','stu1','2025-09-01T10:00:00Z'),
 ('ev1','stu2','2025-09-02T11:00:00Z'),
 ('ev2','stu1','2025-09-03T11:00:00Z');

INSERT INTO attendance (event_id, student_id, attended_at, present) VALUES
 ('ev1','stu1','2025-09-10T09:10:00Z',1),
 ('ev1','stu2','2025-09-10T09:20:00Z',1);

INSERT INTO feedback (event_id, student_id, rating, comment, created_at) VALUES
 ('ev1','stu1',5,'Great workshop','2025-09-10T13:00:00Z'),
 ('ev1','stu2',4,'Nice','2025-09-10T13:05:00Z');
