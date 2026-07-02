function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

function formatPrice(amount) {
  return formatCurrency(amount);
}

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('vi-VN');
}

function formatTime(dateTimeString) {
  if (!dateTimeString) return '';
  return new Date(dateTimeString).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDateTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Lấy ngày/tháng/năm
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  // Lấy giờ:phút
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

module.exports = {
  formatCurrency,
  formatPrice,
  formatDate,
  formatTime,
  formatDateTime
};