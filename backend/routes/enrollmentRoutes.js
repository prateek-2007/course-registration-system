const express = require('express');
const router = express.Router();
const {
  enrollInCourse,
  dropCourse,
  getMyCourses,
} = require('../controllers/enrollmentController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(protect, authorizeRoles('student'));

router.get('/my-courses', getMyCourses);
router.post('/:courseId', enrollInCourse);
router.delete('/:courseId', dropCourse);

module.exports = router;
