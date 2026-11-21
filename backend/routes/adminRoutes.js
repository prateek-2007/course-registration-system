const express = require('express');
const router = express.Router();
const {
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseEnrollments,
  getAdminDashboard,
  createAdminAccount,
  getAuditLogs,
  getStudents,
  createStudentByAdmin,
  updateStudentByAdmin,
  deleteStudentByAdmin,
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(protect, authorizeRoles('admin'));

router.get('/dashboard', getAdminDashboard);
router.post('/admins', createAdminAccount);
router.get('/audit-logs', getAuditLogs);

router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourse);
router.get('/courses/:id/enrollments', getCourseEnrollments);

router.get('/students', getStudents);
router.post('/students', createStudentByAdmin);
router.put('/students/:id', updateStudentByAdmin);
router.delete('/students/:id', deleteStudentByAdmin);

module.exports = router;
