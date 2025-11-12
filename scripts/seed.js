/* Seed script for Routes and Accomodations */
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const Route = require('../models/Route');
const Accomodation = require('../models/Accomodation');
const User = require('../models/User');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDB(uri);

  const routes = [
    {
      name: 'Arusha – Tarangire National Park',
      origin: 'Arusha',
      destination: 'Tarangire National Park',
      description: 'Depart from Arusha after breakfast and drive to Tarangire NP for an afternoon game drive and overnight at lodge.',
      day: 1,
      accomodation: { name: 'Tarangire Osupuko Lodge', price: 0 },
      vehicle_fee: 0,
      park_fee: 60,
      adult_number: 2,
      children_number: 0,
    },
    {
      name: 'Arusha – Lake Manyara National Park',
      origin: 'Arusha',
      destination: 'Lake Manyara National Park',
      description: 'Morning drive to Lake Manyara for game drive, famous for tree-climbing lions and flamingos.',
      day: 2,
      accomodation: { name: 'Lake Manyara Lodge', price: 0 },
      vehicle_fee: 0,
      park_fee: 60,
      adult_number: 2,
      children_number: 0,
    },
    {
      name: 'Arusha – Ngorongoro Conservation Area',
      origin: 'Arusha',
      destination: 'Ngorongoro Conservation Area',
      description: 'Drive to Ngorongoro highlands, crater rim visit with panoramic views.',
      day: 3,
      accomodation: { name: 'Karatu Lodge', price: 0 },
      vehicle_fee: 0,
      park_fee: 60,
      adult_number: 2,
      children_number: 0,
    },
    {
      name: 'Arusha – Central Serengeti via Ngorongoro',
      origin: 'Arusha',
      destination: 'Central Serengeti (Seronera)',
      description: 'Pass through Ngorongoro highlands into Serengeti with en-route game drives.',
      day: 6,
      accomodation: { name: 'Boa Bab Serengeti Camp', price: 0 },
      vehicle_fee: 0,
      park_fee: 83,
      concession_fee: 72,
      transit_fee: 72,
      adult_number: 2,
      children_number: 1,
    },
    {
      name: 'Arusha – Ndutu via Ngorongoro',
      origin: 'Arusha',
      destination: 'Ndutu (South Serengeti)',
      description: 'Travel through Karatu and Ngorongoro to Ndutu plains, heart of the calving season.',
      day: 4,
      accomodation: { name: 'Nyikani Migration Camp', price: 0 },
      vehicle_fee: 0,
      park_fee: 83,
      concession_fee: 72,
      transit_fee: 72,
      adult_number: 2,
      children_number: 1,
    },
    {
      name: 'Arusha – North Serengeti (Kogatende) via Ngorongoro',
      origin: 'Arusha',
      destination: 'North Serengeti (Kogatende)',
      description: 'Drive via Ngorongoro and central Serengeti to northern plains near Mara River.',
      day: 8,
      accomodation: { name: 'Kogatende Camp', price: 0 },
      vehicle_fee: 0,
      park_fee: 83,
      concession_fee: 72,
      transit_fee: 72,
      adult_number: 2,
      children_number: 0,
    },
  ];

  const accomodations = [
    { accomodation_name: 'Kibo Palace Hotel', route_name: 'Arrival – Arusha', price: 0, isConserved: false, concession_fee: 0 },
    { accomodation_name: 'Tarangire Osupuko Lodge', route_name: 'Arusha – Tarangire National Park', price: 0, isConserved: true, concession_fee: 0 },
    { accomodation_name: 'Nyikani Migration Camp', route_name: 'Arusha – Ndutu via Ngorongoro', price: 0, isConserved: true, concession_fee: 0 },
    { accomodation_name: 'Boa Bab Serengeti Camp', route_name: 'Arusha – Central Serengeti via Ngorongoro', price: 0, isConserved: true, concession_fee: 0 },
    { accomodation_name: 'Lamama Hotel', route_name: 'Flight to Arusha – Transfer to Kilimanjaro', price: 0, isConserved: false, concession_fee: 0 },
  ];

  // Upserts for routes
  for (const r of routes) {
    await Route.findOneAndUpdate(
      { name: r.name },
      { $set: r },
      { upsert: true, new: true }
    );
  }

  // Upserts for accomodations
  for (const a of accomodations) {
    await Accomodation.findOneAndUpdate(
      { accomodation_name: a.accomodation_name, route_name: a.route_name },
      { $set: a },
      { upsert: true, new: true }
    );
  }

  // Seed default user
  await User.findOneAndUpdate(
    { name: 'samia' },
    { $set: { name: 'samia', password: '2025', role: 'admin' } },
    { upsert: true, new: true }
  );

  console.log('Seed complete.');
  await mongoose.connection.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
