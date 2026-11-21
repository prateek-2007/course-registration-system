# University Course Registration & Management System (MERN Stack)

A secure, concurrency-safe Course Registration and Management Web Application built for undergraduate students and academic administrators using the MERN Stack (MongoDB, Express.js, React.js, Node.js).

## 1. System Architecture & Technology Stack

- Database: MongoDB with Mongoose ODM (compound unique indexes, mathematical time-interval validators, and multi-document ACID transactions with standalone fallback).
- Backend: Node.js & Express.js REST API with JWT stateless authentication, bcryptjs password hashing, and role-based access control (authMiddleware.js, roleMiddleware.js).
- Frontend: React.js (Vite) Single-Page Application using React Router v6, Context API (AuthContext.jsx), and Axios request interceptors.

## 2. Core Registration & Concurrency Rules Enforced

1. Limited Seats & Concurrency Safety: Atomic seat reservation via Course.findOneAndUpdate with $expr ($lt: ['$enrolledCount', '$capacity']) prevents race conditions and overbooking when multiple students compete for the final seat.
2. Duplicate Registration Prevention: Enforced both in the controller and at the MongoDB storage engine level via a compound unique index { studentId: 1, courseId: 1 } on the Enrollment collection.
3. Mathematical Time-Slot Conflict Prevention: Converts startTime and endTime into minutes since midnight (0 - 1439) and checks startA < endB && startB < endA on matching calendar dates.
4. Registration Ownership: Students can only drop courses tied to their own verified JWT req.user._id.
5. Append-Only Audit Logging: All registrations, drops, and admin course operations are recorded in AuditLog, which blocks update and delete operations via Mongoose pre-hooks.

## 3. REST API Endpoints

- POST /api/auth/register — Register a new student account (role forced to student)
- POST /api/auth/login — Authenticate Student or Administrator and issue JWT
- GET /api/auth/me — Return current user profile from verified JWT
- GET /api/courses — Paginated course list with search & availableSeats
- GET /api/courses/:id — Detailed course view and real-time seat metrics
- POST /api/admin/courses — Admin Only: Create a new course and record COURSE_CREATED audit log
- PUT /api/admin/courses/:id — Admin Only: Update course details/capacity (capacity >= enrolledCount)
- DELETE /api/admin/courses/:id — Admin Only: Safely deactivate (if students enrolled) or delete course
- GET /api/admin/courses/:id/enrollments — Admin Only: View registered student roster for a course
- GET /api/admin/dashboard — Admin Only: System KPIs (totalStudents, totalCourses, totalEnrollments)
- GET /api/admin/audit-logs — Admin Only: View paginated append-only system audit logs
- POST /api/enrollments/:courseId — Student Only: Concurrency-safe course registration
- DELETE /api/enrollments/:courseId — Student Only: Drop an enrolled course and release seat in real time
- GET /api/enrollments/my-courses — Student Only: View active timetable and personal enrollment history

## 4. Default Test Accounts

- Administrator: admin@university.edu / Admin@123
- Student 1: aarav@university.edu / Password123 (Student ID: 221IT017)
- Student 2: priya@university.edu / Password123 (Student ID: 221IT018)
