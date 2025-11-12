const express = require('express');
const { ensureAuth } = require('../middlewares/authCheck');
const RouteModel = require('../models/Route');
const Accomodation = require('../models/Accomodation');
const Itinerary = require('../models/Itinerary');
const { computeItineraryTotals } = require('../utils/calc');

const router = express.Router();

// Dashboard home
router.get('/', ensureAuth, async (req, res, next) => {
  try {
    // Placeholder metrics for prototype; wire real data later
    res.render('dashboard/index', {
      title: 'Dashboard • Overview',
      description: 'Your itinerary dashboard overview.',
      keywords: 'dashboard, overview, itinerary',
      page: 'dashboard',
      totalOrders: 0,
      processingCount: 0,
      pendingCount: 0,
      completedCount: 0,
      transactions: [],
    });
  } catch (err) { next(err); }
});

// Removed unrelated SMM-like dashboard routes (services, orders, add-funds)

// Itineraries list
router.get('/itineraries', ensureAuth, async (req, res, next) => {
  try {
    const itineraries = await Itinerary.find({}).sort({ createdAt: -1 }).lean();
    res.render('itineraries/index', {
      title: 'Itineraries',
      description: 'List of saved itineraries.',
      keywords: 'itineraries, list',
      page: 'itineraries',
      itineraries,
    });
  } catch (err) { next(err); }
});

// New itinerary - step 1: choose routes and order
router.get('/itineraries/new', ensureAuth, async (req, res, next) => {
  try {
    const [routes, accomodations] = await Promise.all([
      RouteModel.find({}).sort({ day: 1, name: 1 }).select('name day origin destination').lean(),
      Accomodation.find({}).sort({ accomodation_name: 1 }).select('accomodation_name price route_name').lean(),
    ]);
    res.render('itineraries/new-step1', {
      title: 'New Itinerary • Step 1',
      description: 'Enter details and add days with route and accommodation.',
      keywords: 'itinerary, new, routes, accommodation',
      page: 'itineraries',
      routes,
      accomodations,
    });
  } catch (err) { next(err); }
});

// Step 2: choose accommodations for selected routes
router.post('/itineraries/new/choose-acc', ensureAuth, async (req, res, next) => {
  try {
    const { title, startDate, adults, children } = req.body;
    // Arrays from dynamic rows
    const dayArr = Array.isArray(req.body.day) ? req.body.day : [req.body.day].filter(Boolean);
    const routeNameArr = Array.isArray(req.body.routeName) ? req.body.routeName : [req.body.routeName].filter(Boolean);
    const accomodationNameArr = Array.isArray(req.body.accomodationName) ? req.body.accomodationName : [req.body.accomodationName].filter(Boolean);

    const rows = dayArr.map((d, i) => ({
      day: Number(d || i + 1),
      routeName: (routeNameArr[i] || '').trim(),
      accomodationName: (accomodationNameArr[i] || '').trim(),
    })).filter(r => r.routeName);

    if (rows.length === 0) {
      req.flash('error', 'Please add at least one day with a route.');
      return res.redirect('/dashboard/itineraries/new');
    }

    // Fetch needed docs
    const routeNames = [...new Set(rows.map(r => r.routeName))];
    const accNames = [...new Set(rows.map(r => r.accomodationName).filter(Boolean))];
    const [routesAll, accAll] = await Promise.all([
      RouteModel.find({ name: { $in: routeNames } }).lean(),
      Accomodation.find({ accomodation_name: { $in: accNames } }).lean(),
    ]);
    const routeByName = new Map(routesAll.map(r => [r.name, r]));
    const accByName = new Map(accAll.map(a => [a.accomodation_name, a]));

    // Normalize days with ids and prices, and compute totals
    const daysNorm = rows
      .map(r => ({
        day: r.day,
        routeDoc: routeByName.get(r.routeName),
        accomodationDoc: r.accomodationName ? accByName.get(r.accomodationName) : null,
      }))
      .filter(x => x.routeDoc)
      .sort((a, b) => a.day - b.day);

    if (daysNorm.length === 0) {
      req.flash('error', 'Selected routes were not found.');
      return res.redirect('/dashboard/itineraries/new');
    }

    const routes = daysNorm.map(x => x.routeDoc);
    const daysForCalc = daysNorm.map(x => ({
      routeId: x.routeDoc._id,
      accomodation: {
        name: x.accomodationDoc ? x.accomodationDoc.accomodation_name : (x.routeDoc.accomodation?.name || 'N/A'),
        price: x.accomodationDoc ? Number(x.accomodationDoc.price || 0) : Number(x.routeDoc.accomodation?.price || 0),
      }
    }));
    const pax = { adults: Number(adults || 0), children: Number(children || 0) };
    const result = computeItineraryTotals(routes, daysForCalc, pax);

    res.render('itineraries/review', {
      title: 'New Itinerary • Review',
      description: 'Review your itinerary and totals before saving.',
      keywords: 'itinerary, review, totals',
      page: 'itineraries',
      titleDraft: title,
      startDateDraft: startDate,
      pax,
      days: daysNorm.map((x, idx) => ({
        index: idx + 1,
        day: x.day,
        route: x.routeDoc,
        accomodationName: x.accomodationDoc ? x.accomodationDoc.accomodation_name : (x.routeDoc.accomodation?.name || 'N/A'),
        accomodationPrice: x.accomodationDoc ? Number(x.accomodationDoc.price || 0) : Number(x.routeDoc.accomodation?.price || 0),
      })),
      totals: result.totals,
    });
  } catch (err) { next(err); }
});

// Create itinerary
router.post('/itineraries', ensureAuth, async (req, res, next) => {
  try {
    const { title, startDate, adults, children, routeId, accomodationName, accomodationPrice } = req.body;
    if (!title) { req.flash('error', 'Title is required.'); return res.redirect('/dashboard/itineraries/new'); }
    const routeIds = Array.isArray(routeId) ? routeId : [routeId].filter(Boolean);
    const names = Array.isArray(accomodationName) ? accomodationName : [accomodationName];
    const prices = Array.isArray(accomodationPrice) ? accomodationPrice : [accomodationPrice];
    const days = routeIds.map((id, i) => ({ routeId: id, accomodation: { name: names[i] || 'N/A', price: Number(prices[i] || 0) } }));

    const routes = await RouteModel.find({ _id: { $in: routeIds } }).lean();
    const pax = { adults: Number(adults || 0), children: Number(children || 0) };
    const { totals } = computeItineraryTotals(routes, days, pax);

    const doc = await Itinerary.create({
      title: title.trim(),
      startDate: startDate ? new Date(startDate) : null,
      pax,
      days: days.map(d => ({ route: d.routeId, accomodation: d.accomodation })),
      totals,
    });
    return res.redirect(`/dashboard/itineraries/${doc._id}`);
  } catch (err) { next(err); }
});

// Show itinerary
router.get('/itineraries/:id', ensureAuth, async (req, res, next) => {
  try {
    const it = await Itinerary.findById(req.params.id).populate('days.route').lean();
    if (!it) { req.flash('error', 'Itinerary not found.'); return res.redirect('/dashboard/itineraries'); }
    res.render('itineraries/show', {
      title: `Itinerary • ${it.title}`,
      description: 'Itinerary details and totals.',
      keywords: 'itinerary, details, totals',
      page: 'itineraries',
      it,
    });
  } catch (err) { next(err); }
});

module.exports = router;
