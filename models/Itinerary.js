const mongoose = require('mongoose');

const itineraryDaySchema = new mongoose.Schema(
  {
    route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
    accomodation: {
      name: { type: String, required: true },
      price: { type: Number, required: true, default: 0 },
    },
  },
  { _id: false }
);

const itinerarySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    startDate: { type: Date },
    pax: {
      adults: { type: Number, default: 2 },
      children: { type: Number, default: 0 },
    },
    days: { type: [itineraryDaySchema], default: [] },
    totals: {
      accomodation: { type: Number, default: 0 },
      vehicle: { type: Number, default: 0 },
      park: { type: Number, default: 0 },
      transit: { type: Number, default: 0 },
      grand: { type: Number, default: 0 },
    },
    inclusions: { type: [String], default: [] },
    exclusions: { type: [String], default: [] },
    profit: {
      percent: { type: Number, default: 0 },
      amount: { type: Number, default: 0 },
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Itinerary', itinerarySchema);
