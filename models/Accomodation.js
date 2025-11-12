const mongoose = require('mongoose');

const accomodationSchema = new mongoose.Schema(
  {
    accomodation_name: { type: String, required: true, trim: true },
    route_name: { type: String, required: true, trim: true },
    price: { type: Number, default: 100 },
    isConserved: { type: Boolean, default: false },
    concession_fee: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Accomodation', accomodationSchema);

