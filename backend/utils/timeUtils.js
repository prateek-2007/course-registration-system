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
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(val).split('T')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(str) ? str : null;
};

/**
 * Strictly validates that a string is a real calendar date (e.g., rejects 2026-02-30)
 */
const isValidCalendarDate = (dateStr) => {
  const iso = toIsoDateString(dateStr);
  if (!iso) return false;
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
};

/**
 * Validates course date, startDate, and applyDeadline:
 * 1. Must be real calendar dates (YYYY-MM-DD)
 * 2. When allowPastDates is false, none of them can be earlier than today
 * 3. applyDeadline cannot be after startDate
 */
const validateCourseDates = ({ date, startDate, applyDeadline, allowPastDates = false }) => {
  if (!isValidCalendarDate(date)) {
    return 'Class timetable date must be a valid calendar date (YYYY-MM-DD).';
  }
  if (startDate && !isValidCalendarDate(startDate)) {
    return 'Course start date must be a valid calendar date (YYYY-MM-DD).';
  }
  if (applyDeadline && !isValidCalendarDate(applyDeadline)) {
    return 'Last date to apply must be a valid calendar date (YYYY-MM-DD).';
  }

  const isoDate = toIsoDateString(date);
  const isoStart = toIsoDateString(startDate) || isoDate;
  const isoDeadline = toIsoDateString(applyDeadline) || isoStart;
  const today = getLocalTodayIso();

  if (!allowPastDates) {
    if (isoDate < today) {
      return `Class timetable date (${isoDate}) cannot be in the past (today is ${today}).`;
    }
    if (isoStart < today) {
      return `Course start date (${isoStart}) cannot be in the past (today is ${today}).`;
    }
    if (isoDeadline < today) {
      return `Last date to apply (${isoDeadline}) cannot be in the past (today is ${today}).`;
    }
  }

  if (isoDeadline > isoStart) {
    return `Last date to apply (${isoDeadline}) cannot be after the course start date (${isoStart}).`;
  }

  return null;
};

const isDeadlineExpired = (applyDeadline) => {
  if (!applyDeadline) return false;
  const deadlineStr = toIsoDateString(applyDeadline);
  if (!deadlineStr) return false;
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
  const deadlinePassed = isDeadlineExpired(applyDeadline);

  const effectiveStatus =
    row.status === 'inactive'
      ? 'inactive'
      : deadlinePassed
      ? 'closed'
      : 'active';

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
    isDeadlinePassed: deadlinePassed,
    effectiveStatus,
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
  isValidCalendarDate,
  validateCourseDates,
  isDeadlineExpired,
  formatCourseRow,
};
