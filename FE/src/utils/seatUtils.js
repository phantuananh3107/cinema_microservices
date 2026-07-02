const isSeatLocked = (seat, lockedSeats) => {
  return lockedSeats && lockedSeats.some(lockedSeat => lockedSeat.id === seat.id);
};

const isSeatBooked = (seat, bookedSeats) => {
  return bookedSeats && bookedSeats.some(bookedSeat => bookedSeat.id === seat.id);
};

const isSeatUnavailable = (seat) => {
  return !seat ||
    seat.status === 'OCCUPIED' ||
    seat.status === 'MAINTENANCE' ||
    seat.status === 'BLOCKED';
};

const isSeatClickable = (seat, lockedSeats, bookedSeats) => {
  if (isSeatUnavailable(seat)) return false;
  if (isSeatLocked(seat, lockedSeats)) return false;
  if (isSeatBooked(seat, bookedSeats)) return false;
  return true;
};

module.exports = {
  isSeatLocked,
  isSeatBooked,
  isSeatUnavailable,
  isSeatClickable
};
