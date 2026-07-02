
// Format date as YYYY-MM-DD
function formatDateForAPI(date) {
  return date.toISOString().split('T')[0];
}

// Get week range (Monday to Sunday) for a given date
function getWeekRange(date = new Date()) {
  const current = new Date(date);
  const dayOfWeek = current.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(current);
  monday.setDate(current.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return {
    startDate: monday,
    endDate: sunday
  };
}

// Get previous week range
function getPreviousWeekRange(date = new Date()) {
  const current = new Date(date);
  current.setDate(current.getDate() - 7);
  return getWeekRange(current);
}

// Get display string for week range
function getWeekDisplayString(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const year = end.getFullYear();
  return `${startStr} - ${endStr}, ${year}`;
}

// Get short day name from date string
function getDayName(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

// Check if date is today
function isToday(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

// Convert date to datetime-local input format (YYYY-MM-DDTHH:mm)
function toLocalDatetimeString(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Format hour number to time string (HH:00)
function formatTime(hour) {
  return `${hour.toString().padStart(2, '0')}:00`;
}

// Format datetime string to time only (HH:mm)
function formatShowtimeTime(dateTimeStr) {
  const date = new Date(dateTimeStr);
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

// Format datetime string to full date and time (DD/MM/YYYY, HH:mm)
function formatDateTime(dateTimeStr) {
  const date = new Date(dateTimeStr);
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Calculate duration in minutes between two time strings 'HH:mm' or datetime strings
function getDurationInMinutes(startTimeStr, endTimeStr) {
  // If both are in 'HH:mm' format
  if (/^\d{2}:\d{2}$/.test(startTimeStr) && /^\d{2}:\d{2}$/.test(endTimeStr)) {
    const [startHour, startMinute] = startTimeStr.split(':').map(Number);
    const [endHour, endMinute] = endTimeStr.split(':').map(Number);
    return (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
  } else {
    // Fallback: treat as datetime strings
    const startTime = new Date(startTimeStr);
    const endTime = new Date(endTimeStr);
    return (endTime - startTime) / (1000 * 60);
  }
}

// Calculate duration in days between two date strings
function getDurationInDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

// Get date range for last N days, return Date objects
function getLastDaysRange(days, referenceDate = new Date()) {
  const endDate = new Date(referenceDate);
  endDate.setDate(endDate.getDate() + 1);
  const startDate = new Date(referenceDate);
  startDate.setDate(startDate.getDate() - days);
  return {
    startDate,
    endDate
  };
}

// Get date range for last N months
function getLastMonthsRange(months, referenceDate = new Date()) {
  const endDate = new Date(referenceDate);
  endDate.setDate(endDate.getDate() + 1);
  const startDate = new Date(referenceDate);
  startDate.setMonth(startDate.getMonth() - months);
  return {
    startDate: formatDateForAPI(startDate),
    endDate: formatDateForAPI(endDate),
  };
}

// Get date range for last N years
function getLastYearsRange(years, referenceDate = new Date()) {
  const endDate = new Date(referenceDate);
  endDate.setDate(endDate.getDate() + 1);
  const startDate = new Date(referenceDate);
  startDate.setFullYear(startDate.getFullYear() - years);
  return {
    startDate: formatDateForAPI(startDate),
    endDate: formatDateForAPI(endDate),
  };
}

// Get group by type from date range
function getGroupByFromDateRange(startDate, endDate) {
  const daysDiff = getDurationInDays(startDate, endDate);
  if (daysDiff >= 365) {
    return 'year';
  } else if (daysDiff >= 30) {
    return 'month';
  }
  return 'day';
}

// Format period display name
function formatPeriodDisplayName(date, groupBy) {
  const dateObj = new Date(date);
  if (groupBy === 'year') {
    return dateObj.toLocaleDateString('vi-VN', { year: 'numeric' });
  } else if (groupBy === 'month') {
    return dateObj.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' });
  } else {
    return dateObj.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
  }
}

// Group revenue data by period
function groupRevenueData(dailyData, groupBy) {
  if (!dailyData || dailyData.length === 0) {
    return [];
  }
  if (groupBy === 'day') {
    return dailyData.map(item => ({
      displayName: formatPeriodDisplayName(item.time_period, 'day'),
      revenue: item.total_revenue,
      bookings: item.total_bookings,
    }));
  }
  const grouped = new Map();
  dailyData.forEach(item => {
    const date = new Date(item.time_period);
    let key;
    if (groupBy === 'year') {
      key = date.getFullYear().toString();
    } else if (groupBy === 'month') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    if (!grouped.has(key)) {
      grouped.set(key, {
        time_period: item.time_period,
        revenue: 0,
        bookings: 0,
      });
    }
    const existing = grouped.get(key);
    existing.revenue += item.total_revenue;
    existing.bookings += item.total_bookings;
  });
  return Array.from(grouped.values()).map(item => ({
    displayName: formatPeriodDisplayName(item.time_period, groupBy),
    revenue: item.revenue,
    bookings: item.bookings,
  }));
}

module.exports = {
  formatDateForAPI,
  getWeekRange,
  getPreviousWeekRange,
  getWeekDisplayString,
  getDayName,
  isToday,
  toLocalDatetimeString,
  formatTime,
  formatShowtimeTime,
  formatDateTime,
  getDurationInMinutes,
  getDurationInDays,
  getLastDaysRange,
  getLastMonthsRange,
  getLastYearsRange,
  getGroupByFromDateRange,
  formatPeriodDisplayName,
  groupRevenueData
};
