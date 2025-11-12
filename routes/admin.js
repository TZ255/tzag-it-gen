const express = require('express');
const { ensureAuth } = require('../middlewares/authCheck');
const { ensureAdmin } = require('../middlewares/adminCheck');
const User = require('../models/User');
const RouteModel = require('../models/Route');
const Accomodation = require('../models/Accomodation');
const Transaction = require('../models/Booking');

const router = express.Router();

// Admin overview (users, routes, accomodations)
router.get('/', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    const [usersCount, routesCount, accomodationsCount, totalCredited] = await Promise.all([
      User.countDocuments({}),
      RouteModel.countDocuments({}),
      Accomodation.countDocuments({}),
      Transaction.aggregate([
        { $match: { type: 'credit' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).then(r => (r[0]?.total || 0))
    ]);
    res.render('admin/index', {
      title: 'Admin • Overview',
      description: 'Summary of key system metrics.',
      keywords: 'admin, overview, metrics',
      page: 'dashboard',
      usersCount,
      servicesActive: routesCount,
      ordersPending: accomodationsCount,
      totalCredited,
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
      page: 'dashboard',
      routes,
    });
  } catch (err) { next(err); }
});

router.post('/routes', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    const { name, description, day, origin, destination, accomodationName, accomodationPrice, vehicle_fee, adult_number, children_number, park_fee, transit_fee } = req.body;
    const errors = [];
    if (!name || !description) errors.push('Please provide route name and description.');
    const dayNum = Number(day || 1);
    const accPrice = Number(accomodationPrice || 0);
    const vehicleFee = Number(vehicle_fee || 0);
    const adults = Number(adult_number || 1);
    const children = Number(children_number || 0);
    const park = Number(park_fee || 0);
    const transit = Number(transit_fee || 0);
    if (!Number.isFinite(dayNum) || dayNum <= 0) errors.push('Day must be a positive number.');
    if (!Number.isFinite(accPrice) || accPrice < 0) errors.push('Accommodation price is invalid.');
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
      accomodation: { name: (accomodationName || '').trim() || 'N/A', price: accPrice },
      vehicle_fee: vehicleFee,
      park_fee: park,
      adult_number: adults,
      children_number: children,
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
      page: 'dashboard',
      routeItem: r,
    });
  } catch (err) { next(err); }
});

// Update route
router.post('/routes/:id/edit', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    const { name, description, day, origin, destination, accomodationName, accomodationPrice, vehicle_fee, adult_number, children_number, park_fee, transit_fee } = req.body;
    const errors = [];
    if (!name || !description) errors.push('Please provide route name and description.');
    const dayNum = Number(day || 1);
    const accPrice = Number(accomodationPrice || 0);
    const vehicleFee = Number(vehicle_fee || 0);
    const adults = Number(adult_number || 1);
    const children = Number(children_number || 0);
    const park = Number(park_fee || 0);
    const transit = Number(transit_fee || 0);
    if (!Number.isFinite(dayNum) || dayNum <= 0) errors.push('Day must be a positive number.');
    if (!Number.isFinite(accPrice) || accPrice < 0) errors.push('Accommodation price is invalid.');
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
          accomodation: { name: (accomodationName || '').trim() || 'N/A', price: accPrice },
          vehicle_fee: vehicleFee,
          park_fee: park,
          adult_number: adults,
          children_number: children,
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
      page: 'dashboard',
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
      page: 'dashboard',
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
      page: 'dashboard',
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

router.post('/users/:id/fund', ensureAuth, ensureAdmin, async (req, res, next) => {
  try {
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount === 0) { req.flash('error', 'Amount is invalid.'); return res.redirect('/admin/users'); }
    const user = await User.findById(req.params.id);
    if (!user) { req.flash('error', 'User not found.'); return res.redirect('/admin/users'); }
    user.balance = (user.balance || 0) + amount;
    await user.save();
    await Transaction.create({ userId: user._id, type: amount > 0 ? 'credit' : 'debit', amount: Math.abs(amount), balanceAfter: user.balance, reference: 'ADMIN-ADJUST' });
    req.flash('success', 'User balance updated.');
    return res.redirect('/admin/users');
  } catch (err) { next(err); }
});

// Orders moderation
// Orders moderation removed for itinerary system

module.exports = router;
