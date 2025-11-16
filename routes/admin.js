const express = require('express');
const { ensureAuth } = require('../middlewares/authCheck');
const { ensureAdmin } = require('../middlewares/adminCheck');
const User = require('../models/User');
const RouteModel = require('../models/Route');
const Accommodation = require('../models/Accommodation');
const Itinerary = require('../models/Itinerary');

const router = express.Router();

// Admin overview (users, routes, accommodations)
router.get('/', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    const [usersCount, routesCount, accomodationsCount, itinerariesCount] = await Promise.all([
      User.countDocuments({}),
      RouteModel.countDocuments({}),
      Accommodation.countDocuments({}),
      Itinerary.countDocuments({}),
    ]);
    res.render('admin/index', {
      title: 'Admin • Overview',
      description: 'Summary of key system metrics.',
      keywords: 'admin, overview, metrics',
      page: 'admin',
      usersCount,
      servicesActive: routesCount,
      ordersPending: accomodationsCount,
      itinerariesCount,
    });
  } catch (err) { next(err); }
});

// Routes management (itinerary routes)
router.get('/routes', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    const routes = await RouteModel.find({}).sort({ createdAt: -1 }).lean();
    res.render('admin/routes', {
      title: 'Admin • Routes',
      description: 'Create or edit itinerary routes.',
      keywords: 'admin, routes, itinerary',
      page: 'admin',
      routes,
    });
  } catch (err) { next(err); }
});

router.post('/routes', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    const { name, description, day, origin, destination, image, vehicle_fee, park_fee_adult, park_fee_child, transit_fee } = req.body;
    const errors = [];
    if (!name || !description) errors.push('Please provide route name and description.');
    const dayNum = Number(day || 1);
    const vehicleFee = Number(vehicle_fee || 0);
    const parkAdult = Number(park_fee_adult || 0);
    const parkChild = Number(park_fee_child || 0);
    const transit = Number(transit_fee || 0);
    if (!Number.isFinite(dayNum) || dayNum <= 0) errors.push('Day must be a positive number.');
    if (!Number.isFinite(vehicleFee) || vehicleFee < 0) errors.push('Vehicle fee is invalid.');
    if (errors.length) {
      req.flash('error', errors.join(' '));
      return res.redirect('/admin/routes');
    }
    await RouteModel.create({
      name: name.trim(),
      description: description.trim(),
      day: dayNum,
      origin: (origin || '').trim(),
      destination: (destination || '').trim(),
      image: (image || '').trim(),
      vehicle_fee: vehicleFee,
      park_fee_adult: parkAdult,
      park_fee_child: parkChild,
      transit_fee: transit,
    });
    req.flash('success', 'Route added successfully.');
    return res.redirect('/admin/routes');
  } catch (err) { next(err); }
});

// Edit route form
router.get('/routes/:id/edit', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    const r = await RouteModel.findById(req.params.id).lean();
    if (!r) { req.flash('error', 'Route not found.'); return res.redirect('/admin/routes'); }
    res.render('admin/edit-route', {
      title: 'Admin • Edit Route',
      description: 'Edit itinerary route.',
      keywords: 'admin, routes, edit',
      page: 'admin',
      routeItem: r,
    });
  } catch (err) { next(err); }
});

// Update route
router.post('/routes/:id/edit', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    const { name, description, day, origin, destination, image, vehicle_fee, park_fee_adult, park_fee_child, transit_fee } = req.body;
    const errors = [];
    if (!name || !description) errors.push('Please provide route name and description.');
    const dayNum = Number(day || 1);
    const vehicleFee = Number(vehicle_fee || 0);
    const parkAdult = Number(park_fee_adult || 0);
    const parkChild = Number(park_fee_child || 0);
    const transit = Number(transit_fee || 0);
    if (!Number.isFinite(dayNum) || dayNum <= 0) errors.push('Day must be a positive number.');
    if (!Number.isFinite(vehicleFee) || vehicleFee < 0) errors.push('Vehicle fee is invalid.');
    if (errors.length) { req.flash('error', errors.join(' ')); return res.redirect(`/admin/routes/${req.params.id}/edit`); }
    await RouteModel.updateOne(
      { _id: req.params.id },
      {
        $set: {
          name: name.trim(),
          description: description.trim(),
          day: dayNum,
          origin: (origin || '').trim(),
          destination: (destination || '').trim(),
          image: (image || '').trim(),
          vehicle_fee: vehicleFee,
          park_fee_adult: parkAdult,
          park_fee_child: parkChild,
          transit_fee: transit,
        }
      }
    );
    req.flash('success', 'Route updated successfully.');
    return res.redirect('/admin/routes');
  } catch (err) { next(err); }
});

// Delete route (no accommodation reference check since schema changed)
router.post('/routes/:id/delete', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    const route = await RouteModel.findById(req.params.id).lean();
    if (!route) { req.flash('error', 'Route not found.'); return res.redirect('/admin/routes'); }
    await RouteModel.deleteOne({ _id: req.params.id });
    req.flash('info', 'Route deleted.');
    return res.redirect('/admin/routes');
  } catch (err) { next(err); }
});

// Accommodations management
router.get('/accommodations', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    const accommodations = await Accommodation.find({}).sort({ createdAt: -1 }).lean();
    res.render('admin/accommodation', {
      title: 'Admin • Accommodations',
      description: 'Create or edit accommodations.',
      keywords: 'admin, accommodations, lodging',
      page: 'admin',
      accommodations,
    });
  } catch (err) { next(err); }
});

router.post('/accommodations', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    const { accomodation_name, place, isLuxury } = req.body;
    const errors = [];
    if (!accomodation_name || !place) errors.push('Please provide accommodation name and place.');
    if (errors.length) {
      req.flash('error', errors.join(' '));
      return res.redirect('/admin/accommodations');
    }
    await Accommodation.create({
      accomodation_name: accomodation_name.trim(),
      place: place.trim(),
      isLuxury: Boolean(isLuxury),
    });
    req.flash('success', 'Accommodation added successfully.');
    return res.redirect('/admin/accommodations');
  } catch (err) { next(err); }
});

// Edit accommodation form
router.get('/accommodations/:id/edit', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    const a = await Accommodation.findById(req.params.id).lean();
    if (!a) { req.flash('error', 'Accommodation not found.'); return res.redirect('/admin/accommodations'); }
    res.render('admin/edit-accommodation', {
      title: 'Admin • Edit Accommodation',
      description: 'Edit accommodation details.',
      keywords: 'admin, accommodation, edit',
      page: 'admin',
      accommodation: a,
    });
  } catch (err) { next(err); }
});

// Update accommodation
router.post('/accommodations/:id/edit', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    const { accomodation_name, place, isLuxury } = req.body;
    const errors = [];
    if (!accomodation_name || !place) errors.push('Please provide accommodation name and place.');
    if (errors.length) { req.flash('error', errors.join(' ')); return res.redirect(`/admin/accommodations/${req.params.id}/edit`); }
    await Accommodation.updateOne(
      { _id: req.params.id },
      {
        $set: {
          accomodation_name: accomodation_name.trim(),
          place: place.trim(),
          isLuxury: Boolean(isLuxury),
        }
      }
    );
    req.flash('success', 'Accommodation updated successfully.');
    return res.redirect('/admin/accommodations');
  } catch (err) { next(err); }
});

// Delete accommodation
router.post('/accommodations/:id/delete', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    await Accommodation.deleteOne({ _id: req.params.id });
    req.flash('info', 'Accommodation deleted.');
    return res.redirect('/admin/accommodations');
  } catch (err) { next(err); }
});

// Users management
router.get('/users', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 }).lean();
    res.render('admin/users', {
      title: 'Admin • Users',
      description: 'List of users, roles and balances.',
      keywords: 'admin, users, roles',
      page: 'admin',
      users,
    });
  } catch (err) { next(err); }
});

router.post('/users/:id/role', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      req.flash('error', 'Role is invalid.');
      return res.redirect('/admin/users');
    }
    await User.updateOne({ _id: req.params.id }, { $set: { role } });
    req.flash('success', 'Role updated.');
    return res.redirect('/admin/users');
  } catch (err) { next(err); }
});

// Orders moderation
// Orders moderation removed for itinerary system

module.exports = router;
