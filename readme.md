# Course Registration System

A full-stack course registration application structured with separate `backend` and `frontend` directories, designed for student course enrollment, real-time synchronization, and administrative management.

---

## Features

### Backend (`backend/`)
- **Authentication & Authorization**: User login, registration, token generation, and role-based access control (`authController.js`, `authroutes.js`, `generateToken.js`, `authMiddleware.js`, `rolemiddleware.js`).
- **Course & Enrollment Management**: Endpoints and controllers for browsing courses and managing student enrollments (`courseController.js`, `courseRoutes.js`, `enrollmentController.js`, `enrollmentRoutes.js`).
- **Admin Dashboard & Audit Logging**: Administrative controls and audit tracking (`adminController.js`, `adminRoutes.js`, `auditlog.js`).
- **Real-Time Events & Time Utilities**: Live event broadcasting and time-conflict/schedule utilities (`liveEvents.js`, `timeUtils.js`).
- **Centralized Error Handling**: Unified error middleware (`errormiddleware.js`).

### Frontend (`frontend/`)
- **Modern React + Vite Setup**: Fast development and build workflow configured with Vite and Oxlint.
- **Role-Based Views**: Dedicated interfaces for students (`StudentDashboard.jsx`, `CourseDetails.jsx`, `MyCourses.jsx`) and administrators (`AdminDashboard.jsx`).
- **Authentication Flow**: `Login.jsx`, `Register.jsx`, `AuthContext.jsx`, and `ProtectedRoute.jsx`.
- **Live Synchronization**: Client-side real-time sync hook (`useLiveSync.js`) paired with an Axios API client (`axios.js`).

---

## Project Structure

```text
course-registration-system/
├── package.json
├── README.md
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── server.js
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── adminController.js
│   │   ├── authController.js
│   │   ├── courseController.js
│   │   └── enrollmentController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── errormiddleware.js
│   │   └── rolemiddleware.js
│   ├── models/
│   │   ├── auditlog.js
│   │   ├── course.js
│   │   ├── enrollment.js
│   │   └── user.js
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   ├── authroutes.js
│   │   ├── courseRoutes.js
│   │   └── enrollmentRoutes.js
│   └── utils/
│       ├── generateToken.js
│       ├── liveEvents.js
│       ├── runAllTests.js
│       ├── seedadmin.js
│       ├── seedDemoData.js
│       ├── seedUniversityScale.js
│       ├── testPhase2.js
│       ├── testPhase3.js
│       ├── testPhase4.js
│       ├── testPhase6Integration.js
│       └── timeUtils.js
└── frontend/
    ├── .oxlintrc.json
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── public/
    │   ├── favicon.svg
    │   └── icons.svg
    └── src/
        ├── App.css
        ├── App.jsx
        ├── index.css
        ├── main.jsx
        ├── api/
        │   ├── axios.js
        │   └── useLiveSync.js
        ├── assets/
        │   ├── hero.png
        │   ├── react.svg
        │   └── vite.svg
        ├── components/
        │   ├── CourseCard.jsx
        │   ├── Navbar.jsx
        │   └── ProtectedRoute.jsx
        ├── context/
        │   └── AuthContext.jsx
        └── pages/
            ├── AdminDashboard.jsx
            ├── CourseDetails.jsx
            ├── Login.jsx
            ├── MyCourses.jsx
            ├── Register.jsx
            └── StudentDashboard.jsx
```

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS recommended)
- npm
- Database instance configured for `backend/config/db.js`

### 1. Clone the Repository
```bash
git clone https://github.com/prateek-2007/course-registration-system.git
cd course-registration-system
```

### 2. Install Dependencies
Install packages across the root, backend, and frontend directories:

```bash
# Root dependencies
npm install

# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the `backend/` directory using `.env.example` as a template:

```bash
cp backend/.env.example backend/.env
```

Update `backend/.env` with your local configuration values (such as database URI, JWT secret, and server port).

### 4. Run the Application

**Start the Backend Server:**
```bash
cd backend
npm run dev
# Or: node server.js (verify exact scripts in backend/package.json)
```

**Start the Frontend Development Server:**
```bash
cd frontend
npm run dev
```

---

## Database Seeding

The `backend/utils/` directory includes scripts to populate the database for development and testing:

| Script | Purpose |
| :--- | :--- |
| `backend/utils/seedadmin.js` | Seeds an initial admin user |
| `backend/utils/seedDemoData.js` | Seeds a standard demo dataset |
| `backend/utils/seedUniversityScale.js` | Seeds a large, university-scale dataset |

Run a seed script from the project root or `backend/` directory:
```bash
node backend/utils/seedadmin.js
node backend/utils/seedDemoData.js
```

---

## Testing

Phase-based and integration tests are located in `backend/utils/`:

- `runAllTests.js` — Executes the complete test suite
- `testPhase2.js`, `testPhase3.js`, `testPhase4.js` — Phase-specific tests
- `testPhase6Integration.js` — Integration tests

Run the full test suite:
```bash
node backend/utils/runAllTests.js
```

---

## API Overview

The backend routes are organized into four main modules under `backend/routes/`:

| Route File | Responsibility | Base Path *(verify in `server.js`)* |
| :--- | :--- | :--- |
| `authroutes.js` | User registration & authentication | `/api/auth` |
| `courseRoutes.js` | Course catalog & course details | `/api/courses` |
| `enrollmentRoutes.js` | Course enrollment & student schedule | `/api/enrollments` |
| `adminRoutes.js` | Admin management & audit logs | `/api/admin` |

---

