const express = require('express');
const { ensureAuth } = require('../middlewares/authCheck');
const { ensureAdmin } = require('../middlewares/adminCheck');
const User = require('../models/User');
const RouteModel = require('../models/Route');
const Accomodation = require('../models/Accomodation');
const Itinerary = require('../models/Itinerary');

const router = express.Router();

// Admin overview (users, routes, accomodations)
router.get('/', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    const [usersCount, routesCount, accomodationsCount, itinerariesCount] = await Promise.all([
      User.countDocuments({}),
      RouteModel.countDocuments({}),
      Accomodation.countDocuments({}),
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
    const [routes, accomodations] = await Promise.all([
      RouteModel.find({}).sort({ createdAt: -1 }).lean(),
      Accomodation.find({}).sort({ accomodation_name: 1 }).lean(),
    ]);
    res.render('admin/routes', {
      title: 'Admin • Routes',
      description: 'Create or edit itinerary routes.',
      keywords: 'admin, routes, itinerary',
      page: 'admin',
      routes,
      accomodations,
    });
  } catch (err) { next(err); }
});

router.post('/routes', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    const { name, description, day, origin, destination, accomodationName, vehicle_fee, park_fee_adult, park_fee_child, transit_fee } = req.body;
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
    // Lookup accommodation price from DB
    let accPrice = 0; let accName = 'N/A';
    if (accomodationName) {
      const accDoc = await Accomodation.findOne({ accomodation_name: accomodationName }).lean();
      accPrice = Number(accDoc?.price || 0);
      accName = accomodationName;
    }
    await RouteModel.create({
      name: name.trim(),
      description: description.trim(),
      day: dayNum,
      origin: (origin || '').trim(),
      destination: (destination || '').trim(),
      accomodation: { name: accName, price: accPrice },
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
    const [r, accomodations] = await Promise.all([
      RouteModel.findById(req.params.id).lean(),
      Accomodation.find({}).sort({ accomodation_name: 1 }).lean(),
    ]);
    if (!r) { req.flash('error', 'Route not found.'); return res.redirect('/admin/routes'); }
    res.render('admin/edit-route', {
      title: 'Admin • Edit Route',
      description: 'Edit itinerary route.',
      keywords: 'admin, routes, edit',
      page: 'admin',
      routeItem: r,
      accomodations,
    });
  } catch (err) { next(err); }
});

// Update route
router.post('/routes/:id/edit', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    const { name, description, day, origin, destination, accomodationName, vehicle_fee, park_fee_adult, park_fee_child, transit_fee } = req.body;
    const errors = [];
    if (!name || !description) errors.push('Please provide route name and description.');
    const dayNum = Number(day || 1);
    const vehicleFee = Number(vehicle_fee || 0);
    const parkAdult = Number(park_fee_adult || 0);
    const parkChild = Number(park_fee_child || 0);
    const transit = Number(transit_fee || 0);
    if (!Number.isFinite(dayNum) || dayNum <= 0) errors.push('Day must be a positive number.');
    if (!Number.isFinite(vehicleFee) || vehicleFee < 0) errors.push('Vehicle fee is invalid.');
    if (!accomodationName) errors.push('Please select an accommodation.');
    if (errors.length) { req.flash('error', errors.join(' ')); return res.redirect(`/admin/routes/${req.params.id}/edit`); }
    const accDoc = await Accomodation.findOne({ accomodation_name: accomodationName }).lean();
    const accPrice = Number(accDoc?.price || 0);
    await RouteModel.updateOne(
      { _id: req.params.id },
      {
        $set: {
          name: name.trim(),
          description: description.trim(),
          day: dayNum,
          origin: (origin || '').trim(),
          destination: (destination || '').trim(),
          accomodation: { name: (accomodationName || '').trim(), price: accPrice },
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

// Delete route
router.post('/routes/:id/delete', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    await RouteModel.deleteOne({ _id: req.params.id });
    req.flash('info', 'Route deleted.');
    return res.redirect('/admin/routes');
  } catch (err) { next(err); }
});

// Accomodations management
router.get('/accomodations', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    const [accomodations, routes] = await Promise.all([
      Accomodation.find({}).sort({ createdAt: -1 }).lean(),
      RouteModel.find({}).sort({ name: 1 }).select('name').lean()
    ]);
    res.render('admin/accomodation', {
      title: 'Admin • Accomodations',
      description: 'Create or edit accomodations.',
      keywords: 'admin, accomodations, lodging',
      page: 'admin',
      accomodations,
      routes,
    });
  } catch (err) { next(err); }
});

router.post('/accomodations', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    const { accomodation_name, route_name, price, isConserved, concession_fee } = req.body;
    const errors = [];
    if (!accomodation_name || !route_name) errors.push('Please provide accommodation and route names.');
    const priceNum = Number(price || 0);
    const feeNum = Number(concession_fee || 0);
    if (!Number.isFinite(priceNum) || priceNum < 0) errors.push('Price is invalid.');
    if (!Number.isFinite(feeNum) || feeNum < 0) errors.push('Concession fee is invalid.');
    if (errors.length) {
      req.flash('error', errors.join(' '));
      return res.redirect('/admin/accomodations');
    }
    await Accomodation.create({
      accomodation_name: accomodation_name.trim(),
      route_name: route_name.trim(),
      price: priceNum,
      isConserved: Boolean(isConserved),
      concession_fee: feeNum,
    });
    req.flash('success', 'Accommodation added successfully.');
    return res.redirect('/admin/accomodations');
  } catch (err) { next(err); }
});

// Edit accommodation form
router.get('/accomodations/:id/edit', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    const [a, routes] = await Promise.all([
      Accomodation.findById(req.params.id).lean(),
      RouteModel.find({}).sort({ name: 1 }).select('name').lean()
    ]);
    if (!a) { req.flash('error', 'Accommodation not found.'); return res.redirect('/admin/accomodations'); }
    res.render('admin/edit-accomodation', {
      title: 'Admin • Edit Accommodation',
      description: 'Edit accommodation details.',
      keywords: 'admin, accommodation, edit',
      page: 'admin',
      accomodation: a,
      routes,
    });
  } catch (err) { next(err); }
});

// Update accommodation
router.post('/accomodations/:id/edit', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    const { accomodation_name, route_name, price, isConserved, concession_fee } = req.body;
    const errors = [];
    if (!accomodation_name || !route_name) errors.push('Please provide accommodation and route names.');
    const priceNum = Number(price || 0);
    const feeNum = Number(concession_fee || 0);
    if (!Number.isFinite(priceNum) || priceNum < 0) errors.push('Price is invalid.');
    if (!Number.isFinite(feeNum) || feeNum < 0) errors.push('Concession fee is invalid.');
    if (errors.length) { req.flash('error', errors.join(' ')); return res.redirect(`/admin/accomodations/${req.params.id}/edit`); }
    await Accomodation.updateOne(
      { _id: req.params.id },
      {
        $set: {
          accomodation_name: accomodation_name.trim(),
          route_name: route_name.trim(),
          price: priceNum,
          isConserved: Boolean(isConserved),
          concession_fee: feeNum,
        }
      }
    );
    req.flash('success', 'Accommodation updated successfully.');
    return res.redirect('/admin/accomodations');
  } catch (err) { next(err); }
});

// Delete accommodation
router.post('/accomodations/:id/delete', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    await Accomodation.deleteOne({ _id: req.params.id });
    req.flash('info', 'Accommodation deleted.');
    return res.redirect('/admin/accomodations');
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
