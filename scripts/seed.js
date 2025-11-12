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
    { accomodation_name: 'Kibo Palace Hotel', route_name: 'Arrival – Arusha', price: 150, isConserved: false, concession_fee: 0 },
    { accomodation_name: 'Tarangire Osupuko Lodge', route_name: 'Arusha – Tarangire National Park', price: 220, isConserved: true, concession_fee: 0 },
    { accomodation_name: 'Marera Valley Lodge', route_name: 'Arusha – Ngorongoro Conservation Area', price: 180, isConserved: false, concession_fee: 0 },
    { accomodation_name: 'Lake Manyara Serena Lodge', route_name: 'Arusha – Lake Manyara National Park', price: 200, isConserved: true, concession_fee: 0 },
    { accomodation_name: 'Nyikani Migration Camp', route_name: 'Arusha – Ndutu via Ngorongoro', price: 260, isConserved: true, concession_fee: 72 },
    { accomodation_name: 'Baobab Serengeti Camp', route_name: 'Arusha – Central Serengeti via Ngorongoro', price: 280, isConserved: true, concession_fee: 72 },
    { accomodation_name: 'Kogatende Tented Camp', route_name: 'Arusha – North Serengeti (Kogatende) via Ngorongoro', price: 300, isConserved: true, concession_fee: 72 },
  ];
  await Accommodation.insertMany(accomodations);

  const routes = [
    {
      name: 'Arusha – Tarangire National Park',
      origin: 'Arusha',
      destination: 'Tarangire National Park',
      description: 'Depart Arusha to Tarangire NP for game drive among elephants and baobabs. Overnight at lodge.',
      day: 1,
      
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
