const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    day: { type: Number, default: 1 },
    origin: { type: String, trim: true },
    destination: { type: String, trim: true },
    accomodation: {
      type: {
        name: { type: String, required: true },
        price: { type: Number, required: true }
      },
      required: true
    },
    vehicle_fee: { type: Number, default: 200 },
    park_fee: { type: Number, default: 0 },
    adult_number: { type: Number, default: 1 },
    children_number: { type: Number, default: 0 },
    // Optional fees (route-level only)
    transit_fee: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Route', routeSchema);
