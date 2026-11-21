const notFound = (req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal Server Error';

  // MySQL Duplicate Entry Error (ER_DUP_ENTRY / errno 1062)
  if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    statusCode = 409;
    if (message.includes('uq_student_course')) {
      message = 'Duplicate registration: You are already registered for this course.';
    } else {
      message = 'Duplicate value entered for a unique field.';
    }
  }

  // MySQL Custom Trigger Signal Error (SQLSTATE 45000 / errno 1644)
  if (err.sqlState === '45000' || err.errno === 1644) {
    statusCode = 403;
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

module.exports = { notFound, errorHandler };
