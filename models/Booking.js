const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('Booking', bookingSchema);

