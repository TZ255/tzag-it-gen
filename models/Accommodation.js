const mongoose = require('mongoose');

const accomodationSchema = new mongoose.Schema(
  {
    accomodation_name: { type: String, required: true, trim: true },
    place: { type: String, required: true, trim: true },
    isLuxury: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Accommodation', accomodationSchema);

