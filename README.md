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

Output:
<img width="1919" height="862" alt="image" src="https://github.com/user-attachments/assets/0685f25c-5771-4a1c-9be9-ab6a40524e1c" />
<img width="1899" height="672" alt="image" src="https://github.com/user-attachments/assets/48a1e568-e3ad-4e8d-95f6-cbba9638212b" />
<img width="1909" height="870" alt="image" src="https://github.com/user-attachments/assets/0e894f73-7e33-4661-b187-7f22b292e201" />
<img width="1906" height="851" alt="image" src="https://github.com/user-attachments/assets/ec930162-918d-452a-9a21-be040d9de4ca" />


There are two version of this the main branch contains the basic framework of the web page and all its components /n
The new branch conatians the app side of this project /n
for the app creation I have used React Native,Axios(API Client for mobile) /n
Platform Module used to navigate in android is expo go and finally React Navigation for routing/n
The backend side was updated with Flask-jwt-extended for authenticaion and token generation/n



AUTHOR:
Arya H
Linkdin Profile:www.linkedin.com/in/arya-h
