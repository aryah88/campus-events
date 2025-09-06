This project is about a website that can handle all the campus events in one place 
With this website both students and teachers and handle all the events happening around the campus.
This web page has 2 parts : 1.student
                            2.admin/teacher
Student can check the events they have registered for and can register for the events happening around the campus 
An admin or a teacher can check the status of egistred students and can mark attendance of the students present to that event 
Teacher can check the entire report of the web page and all the events 

PROJECT STRUCTURE:
campus-events/
├── backend/ # Flask backend (API + SQLite DB)
│ ├── app.py # Main Flask application
│ ├── schema.sql # Database schema
│ ├── events.db # Local database (ignored in git)
│ └── venv/ # Python virtual environment (ignored in git)
│
├── frontend/ # React + Vite frontend
│ ├── src/
│ │ ├── pages/ # Home, Attendance, Reports, Auth pages
│ │ ├── services/ # api.js with API calls
│ │ ├── App.jsx
│ │ └── main.jsx
│ └── package.json
│
├── .gitignore
└── README.md

Features for each page:
Student:
1.view upcoming events
2.register for events (This generates a scannable Qr code for admins to scan for the attendance)
3.See "My registrations"
4.Search and filter the events
5.Feedbacks of the event

Admins:
1.Regestration Stats
2.Attendance Percentage
3.Top Active Students
4.Feedbacks Summary
5.Add new events

TECH STACK:
Frontend: React(Vite,Tailwind CSS,Recharts)
Backend:  Flask(Pyhton),Flask-CORS
Database: SQLite

AUTHOR:
Arya H
Linkdin Profile:www.linkedin.com/in/arya-h
