/* Seed script for Routes and Accommodations */
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const Route = require('../models/Route');
const Accommodation = require('../models/Accommodation');
const User = require('../models/User');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDB(uri);
  // Reset Routes and Accommodations
  await Promise.all([
    Route.deleteMany({}),
    Accommodation.deleteMany({}),
  ]);

  const accomodations = [
    { accomodation_name: 'Kibo Palace Hotel', place: 'Arusha', isLuxury: false },
    { accomodation_name: 'Tarangire Osupuko Lodge', place: 'Tarangire National Park', isLuxury: true },
    { accomodation_name: 'Marera Valley Lodge', place: 'Karatu', isLuxury: false },
    { accomodation_name: 'Lake Manyara Serena Lodge', place: 'Lake Manyara', isLuxury: true },
    { accomodation_name: 'Nyikani Migration Camp', place: 'Ndutu (South Serengeti)', isLuxury: true },
    { accomodation_name: 'Baobab Serengeti Camp', place: 'Central Serengeti', isLuxury: true },
    { accomodation_name: 'Kogatende Tented Camp', place: 'North Serengeti (Kogatende)', isLuxury: true },
  ];
  await Accommodation.insertMany(accomodations);

  const routes = [
    {
      name: 'Arusha – Tarangire National Park',
      origin: 'Arusha',
      destination: 'Tarangire National Park',
      description: 'Depart Arusha to Tarangire NP for game drive among elephants and baobabs. Overnight at lodge.',
      day: 1,
      image: 'https://images.unsplash.com/photo-1543248939-ff40856f65d4?q=80&w=1600&auto=format&fit=crop',
      vehicle_fee: 0,
      park_fee_adult: 60,
      park_fee_child: 30,
      transit_fee: 0,
    },
    {
      name: 'Arusha – Lake Manyara National Park',
      origin: 'Arusha',
      destination: 'Lake Manyara National Park',
      description: 'Morning drive to Lake Manyara for game drive; scenic forests and tree-climbing lions.',
      day: 2,
      image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=1600&auto=format&fit=crop',
      vehicle_fee: 0,
      park_fee_adult: 60,
      park_fee_child: 30,
      transit_fee: 0,
    },
    {
      name: 'Arusha – Ngorongoro Conservation Area',
      origin: 'Arusha',
      destination: 'Ngorongoro Conservation Area',
      description: 'Drive to Ngorongoro highlands; crater rim viewpoints and cultural experiences in Karatu.',
      day: 3,
      image: 'https://images.unsplash.com/photo-1577041249623-11d4aa55c235?q=80&w=1600&auto=format&fit=crop',
      vehicle_fee: 0,
      park_fee_adult: 60,
      park_fee_child: 30,
      transit_fee: 0,
    },
    {
      name: 'Arusha – Ndutu via Ngorongoro',
      origin: 'Arusha',
      destination: 'Ndutu (South Serengeti)',
      description: 'Travel across Ngorongoro to Ndutu plains; wildebeest calving grounds during season.',
      day: 4,
      image: 'https://images.unsplash.com/photo-1581852017103-5c03b5d2e1c0?q=80&w=1600&auto=format&fit=crop',
      vehicle_fee: 0,
      park_fee_adult: 83,
      park_fee_child: 40,
      transit_fee: 72,
    },
    {
      name: 'Arusha – Central Serengeti via Ngorongoro',
      origin: 'Arusha',
      destination: 'Central Serengeti (Seronera)',
      description: 'Enter Serengeti through Ngorongoro; classic savannah and resident predators.',
      day: 5,
      image: 'https://images.unsplash.com/photo-1581852294396-1d60f5da2b5f?q=80&w=1600&auto=format&fit=crop',
      vehicle_fee: 0,
      park_fee_adult: 83,
      park_fee_child: 40,
      transit_fee: 72,
    },
    {
      name: 'Arusha – North Serengeti (Kogatende) via Ngorongoro',
      origin: 'Arusha',
      destination: 'North Serengeti (Kogatende)',
      description: 'Continue to the northern plains; Mara River crossings in migration season.',
      day: 6,
      image: 'https://images.unsplash.com/photo-1516425459321-068c2f4ee0c3?q=80&w=1600&auto=format&fit=crop',
      vehicle_fee: 0,
      park_fee_adult: 83,
      park_fee_child: 40,
      transit_fee: 72,
    },
  ];
  await Route.insertMany(routes);

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
