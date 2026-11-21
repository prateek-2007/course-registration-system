const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return NaN;
  const trimmed = timeStr.trim().toUpperCase();

  const amPmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (amPmMatch) {
    let hours = parseInt(amPmMatch[1], 10);
    const minutes = parseInt(amPmMatch[2], 10);
    const period = amPmMatch[3];
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return NaN;
    if (period === 'AM' && hours === 12) hours = 0;
    if (period === 'PM' && hours !== 12) hours += 12;
    return hours * 60 + minutes;
  }

  const twentyFourMatch = trimmed.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (twentyFourMatch) {
    const hours = parseInt(twentyFourMatch[1], 10);
    const minutes = parseInt(twentyFourMatch[2], 10);
    return hours * 60 + minutes;
  }

  return NaN;
};

const doTimeSlotsOverlap = (startTimeA, endTimeA, startTimeB, endTimeB) => {
  const startA = parseTimeToMinutes(startTimeA);
  const endA = parseTimeToMinutes(endTimeA);
  const startB = parseTimeToMinutes(startTimeB);
  const endB = parseTimeToMinutes(endTimeB);
  return startA < endB && startB < endA;
};

const getLocalTodayIso = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const toIsoDateString = (val) => {
  if (!val) return null;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
    return val.trim();
  }
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val).split('T')[0];
};

const isDeadlineExpired = (applyDeadline) => {
  if (!applyDeadline) return false;
  const deadlineStr = toIsoDateString(applyDeadline);
  const todayStr = getLocalTodayIso();
  return todayStr > deadlineStr;
};

const formatCourseRow = (row) => {
  if (!row) return null;
  const capacity = Number(row.capacity);
  const enrolledCount = Number(row.enrolled_count);
  const scheduleDate = toIsoDateString(row.date);
  const startDate = toIsoDateString(row.start_date) || scheduleDate;
  const applyDeadline = toIsoDateString(row.apply_deadline) || startDate;

  return {
    _id: String(row.id),
    id: String(row.id),
    courseName: row.course_name,
    courseCode: row.course_code,
    facultyName: row.faculty_name || 'TBA',
    description: row.description,
    credits: Number(row.credits),
    date: scheduleDate,
    startDate,
    applyDeadline,
    isDeadlinePassed: isDeadlineExpired(applyDeadline),
    startTime: row.start_time,
    endTime: row.end_time,
    capacity,
    enrolledCount,
    availableSeats: Math.max(0, capacity - enrolledCount),
    status: row.status,
    createdBy: row.creator_name
      ? {
          _id: String(row.created_by),
          name: row.creator_name,
          email: row.creator_email,
        }
      : String(row.created_by),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

module.exports = {
  parseTimeToMinutes,
  doTimeSlotsOverlap,
  getLocalTodayIso,
  toIsoDateString,
  isDeadlineExpired,
  formatCourseRow,
};
