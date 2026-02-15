# AttendAI — Attendance Management System

A modern, face-recognition-based attendance management system built for colleges and universities. Teachers manage courses and sessions; students mark attendance using their face via webcam.

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Authentication | Clerk |
| Database | NeonDB (PostgreSQL) via Drizzle ORM |
| Face Recognition | face-api.js (browser-side ML) |
| Real-Time | Pusher (WebSockets) |
| File Uploads | UploadThing |
| Scheduled Jobs | QStash by Upstash |
| Charts | Recharts |
| AI Advisor | Google Gemini 2.5 Flash Lite |
| Animations | Motion (Framer Motion) |

---

## How Authentication Works

The system uses Clerk for authentication. When a user signs up or logs in, they are sent to `/dashboard` — a smart redirect hub that checks their role and sends them to the correct place automatically.

- If the email matches a configured teacher email, the user is assigned the **teacher** role.
- All other sign-ups are assigned the **student** role.
- Teacher emails are configured via the `TEACHER_EMAILS` environment variable (comma-separated).
- After sign-in or sign-up, the system checks the user's role and whether they have completed onboarding, then routes them accordingly — no manual page refresh needed.

---

## Student Portal

### 1. Onboarding
When a student signs up for the first time, they are taken to an onboarding page where they fill in their academic details — roll number, department, semester, and section. This creates their student profile in the database. After completing onboarding, they are directed to face enrollment.

### 2. Face Enrollment
Students register their face so the system can recognize them during attendance. They can either use their webcam to capture multiple frames in real time, or upload a photo from their device. The system processes the image using face-api.js, extracts a 128-point face descriptor (a numerical fingerprint of the face), and stores it in the database. This is a one-time setup that can be updated at any time.

### 3. Student Dashboard
The main landing page after login. It shows:
- **Enrolled Courses** — how many courses the student is currently enrolled in
- **Overall Attendance Percentage** — across all courses combined
- **Classes Today** — how many classes are scheduled for the current day
- **Active Session Alert** — if any teacher has started a live attendance session for an enrolled course, a prominent banner appears with a direct link to mark attendance
- **Today's Schedule** — a list of classes for the day with time and room details
- **Recent Attendance** — a quick view of the last few attendance records

### 4. My Courses
A detailed view of every course the student is enrolled in. Each course card shows:
- Course name and code
- The teacher's name
- Department, semester, and section
- Attendance percentage (color-coded: green for safe, yellow for warning, red for critical)
- How many sessions the student has attended out of the total

### 5. Mark Attendance
When a teacher starts a live attendance session, enrolled students receive a real-time push notification via Pusher. Clicking the notification or the alert on the dashboard opens the attendance marking page. The student's webcam activates and the system captures their face, compares it against the stored face descriptor, and marks them as present if the similarity score meets the configured confidence threshold (default 75%, adjustable via environment variable). The comparison happens entirely in the browser using face-api.js.

### 6. Attendance History
A filterable log of all attendance records. Students can filter by course or view all records at once. The page shows:
- Total classes held
- How many they attended
- Their overall attendance percentage
- A full table with date, course, status (present/absent), time marked, and confidence score

### 7. AI Attendance Advisor (AttendAI)
A floating chat widget powered by Google Gemini AI, available on every page of the student portal. The AI has full context about the student's attendance data — per-course percentages, how many classes they can still miss while staying above 75%, which courses are at risk, and today's schedule. Students can ask natural language questions and get personalized advice. Quick suggestion chips are provided for common questions. The AI only uses real data from the database and never fabricates information.

---

## Teacher Portal

### 1. Teacher Dashboard
The main landing page for teachers. It shows:
- **Total Courses** — number of courses being taught
- **Total Students** — total students enrolled across all courses
- **Active Sessions** — if any attendance session is currently live, an alert appears with a direct link to the live view
- **Classes Today** — how many classes are scheduled for the day
- **Today's Schedule** — a list of today's classes with time, room, and a quick button to start an attendance session
- **Recent Sessions** — the last few attendance sessions with their date, course, and present/total count

### 2. Course Management
Teachers can create new courses by specifying the course name, code, department, semester, and section. All courses appear in a card grid. Clicking a course opens its detail page. Each card shows the number of enrolled students and basic course info.

### 3. Course Detail
Each course has a tabbed detail page with three sections:

**Students Tab** — A table of all enrolled students showing their roll number, name, email, and enrollment date. Teachers can add students by their roll number or remove them from the course.

**Sessions Tab** — A history of all attendance sessions for the course. Shows the date, start/end time, how many students were present out of the total enrolled, and the session status. Active sessions have a "View Live" button. Teachers can start a new session directly from this tab.

**Timetable Tab** — The recurring weekly schedule for the course. Teachers can add entries specifying the day of the week, start and end time, and room number. The dashboard uses this to determine which classes are scheduled for today.

### 4. Start Session
Teachers can start a new attendance session for any course. Once started, the session becomes "active" and all enrolled students receive a real-time push notification on their devices (via Pusher) prompting them to mark their attendance.

### 5. Live Session View
A real-time dashboard showing the current state of an active attendance session. It displays:
- Session status (LIVE or ENDED)
- Present count out of total enrolled students, with a progress bar
- Time remaining (if an end time is set)
- Time the session started
- A table of every enrolled student with their attendance status (present/absent), the time they were marked, and the confidence score from face recognition

Teachers can manually mark any absent student as present directly from this view (useful if face recognition fails for a student). There is also an "End Session" button to close the session.

### 6. Reports
A per-course analytics dashboard. Teachers select a course from a dropdown and see:
- Total number of sessions held
- Average attendance percentage across all sessions
- Date of the most recent session
- A bar chart comparing present vs. total students per session
- A line chart showing the attendance percentage trend over time
- A full session history table with date, present count, total enrolled, attendance percentage, and status

---

## Real-Time Notifications

When a teacher starts a session, the server sends a Pusher event to a channel specific to each enrolled student. The student's browser listens on this channel and displays a toast notification. Tapping the notification takes them directly to the attendance marking page for that session.

---

## Face Recognition — How It Works

Face recognition happens entirely in the browser (client-side) using face-api.js, which loads pre-trained neural network models. During enrollment, the system captures 5 frames from the webcam, computes a face descriptor for each, and averages them to produce a stable 128-number fingerprint stored in the database.

During attendance marking, the student's webcam is activated, a descriptor is computed in real time, and it is compared against the stored descriptor using Euclidean distance. If the similarity exceeds the configured threshold (default 75%), the attendance is recorded as present along with the confidence score. The threshold is configurable via the `NEXT_PUBLIC_FACE_MATCH_THRESHOLD` environment variable.

---

## Scheduled Jobs

QStash by Upstash is used for automated tasks such as ending expired sessions. A cron endpoint can be triggered to automatically close attendance sessions that have passed their scheduled end time, preventing sessions from remaining "active" indefinitely if a teacher forgets to end them.
