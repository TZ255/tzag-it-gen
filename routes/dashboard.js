const express = require('express');
const { ensureAuth } = require('../middlewares/authCheck');
const RouteModel = require('../models/Route');
const Accommodation = require('../models/Accommodation');
const Itinerary = require('../models/Itinerary');
const { computeItineraryTotals } = require('../utils/calc');
const { generateItineraryOverview } = require('../utils/ai');

const router = express.Router();

function textAreaToList(text) {
  if (!text) return [];
  return String(text)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

function normalizePercent(value) {
  const pct = Number(value);
  if (!Number.isFinite(pct)) return 0;
  return Math.max(0, Math.min(100, pct));
}

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
    const [routes, accommodations] = await Promise.all([
      RouteModel.find({}).sort({ day: 1, name: 1 }).select('name day origin destination').lean(),
      Accommodation.find({}).sort({ accomodation_name: 1 }).select('accomodation_name place isLuxury').lean(),
    ]);
    res.render('itineraries/new-step1', {
      title: 'New Itinerary • Step 1',
      description: 'Enter details and add days with route and accommodation.',
      keywords: 'itinerary, new, routes, accommodation',
      page: 'itineraries',
      routes,
      accomodations: accommodations,
    });
  } catch (err) { next(err); }
});

// Step 2: choose accommodations for selected routes
router.post('/itineraries/new/choose-acc', ensureAuth, async (req, res, next) => {
  try {
    const { title, clientName, startDate, adults, children, inclusionsText, exclusionsText, profitPercent } = req.body;
    // Arrays from dynamic rows
    const dayArr = Array.isArray(req.body.day) ? req.body.day : [req.body.day].filter(Boolean);
    const routeIdArr = Array.isArray(req.body.routeId) ? req.body.routeId : [req.body.routeId].filter(Boolean);
    const accomodationIdArr = Array.isArray(req.body.accomodationId) ? req.body.accomodationId : [req.body.accomodationId].filter(Boolean);
    const adultPriceArr = Array.isArray(req.body.adult_price) ? req.body.adult_price : [req.body.adult_price].filter(Boolean);
    const childPriceArr = Array.isArray(req.body.child_price) ? req.body.child_price : [req.body.child_price].filter(Boolean);

    const rows = dayArr
      .map((d, i) => ({
        day: Number(d || i + 1),
        routeId: (routeIdArr[i] || '').trim(),
        accomodationId: (accomodationIdArr[i] || '').trim(),
        adult_price: Number(adultPriceArr[i] || 0),
        child_price: Number(childPriceArr[i] || 0),
      }))
      .filter(r => r.routeId);

    if (rows.length === 0) {
      req.flash('error', 'Please add at least one day with a route.');
      return res.redirect('/dashboard/itineraries/new');
    }

    // Fetch needed docs
    const routeIds = [...new Set(rows.map(r => r.routeId))];
    const accIds = [...new Set(rows.map(r => r.accomodationId).filter(Boolean))];
    const [routesAll, accAll] = await Promise.all([
      RouteModel.find({ _id: { $in: routeIds } }).lean(),
      Accommodation.find({ _id: { $in: accIds } }).lean(),
    ]);
    const routeById = new Map(routesAll.map(r => [String(r._id), r]));
    const accById = new Map(accAll.map(a => [String(a._id), a]));

    // Normalize days with ids and prices, and compute totals
    const daysNorm = rows
      .map(r => ({
        day: r.day,
        routeDoc: routeById.get(r.routeId),
        accomodationDoc: r.accomodationId ? accById.get(r.accomodationId) : null,
        accomodationId: r.accomodationId || '',
        adult_price: Number(r.adult_price || 0),
        child_price: Number(r.child_price || 0),
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
        name: x.accomodationDoc ? x.accomodationDoc.accomodation_name : 'N/A',
        adult_price: x.adult_price,
        child_price: x.child_price,
      }
    }));
    const pax = { adults: Number(adults || 0), children: Number(children || 0) };
    const result = computeItineraryTotals(routes, daysForCalc, pax);
    const profitPct = normalizePercent(profitPercent || 0);
    const baseGrand = Number(result.totals.grand || 0);
    const profitAmount = baseGrand * (profitPct / 100);
    const totalsWithProfit = {
      ...result.totals,
      grandWithProfit: baseGrand + profitAmount,
    };
    const inclusionsList = textAreaToList(inclusionsText);
    const exclusionsList = textAreaToList(exclusionsText);

    res.render('itineraries/review', {
      title: 'New Itinerary • Review',
      description: 'Review your itinerary and totals before saving.',
      keywords: 'itinerary, review, totals',
      page: 'itineraries',
      titleDraft: title,
      clientNameDraft: clientName,
      startDateDraft: startDate,
      pax,
      inclusionsList,
      exclusionsList,
      profitPercent: profitPct,
      profitAmount,
      totalsWithProfit,
      inclusionsText,
      exclusionsText,
      days: daysNorm.map((x, idx) => {
        const vehicleFee = Number(x.routeDoc.vehicle_fee || 0);
        const transitFee = Number(x.routeDoc.transit_fee || 0);
        const parkAdult = Number(x.routeDoc.park_fee_adult || 0) * Number(pax.adults || 0);
        const parkChild = Number(x.routeDoc.park_fee_child || 0) * Number(pax.children || 0);
        const parkTotal = (typeof x.routeDoc.park_fee_adult !== 'undefined' || typeof x.routeDoc.park_fee_child !== 'undefined')
          ? (parkAdult + parkChild)
          : Number(x.routeDoc.park_fee || 0);
        const adultUnit = Number(x.adult_price || 0);
        const childUnit = Number(x.child_price || 0);
        const accomodationTotal = (adultUnit * Number(pax.adults || 0)) + (childUnit * Number(pax.children || 0));
        return {
          index: idx + 1,
          day: x.day,
          route: x.routeDoc,
          accomodationName: x.accomodationDoc ? x.accomodationDoc.accomodation_name : (x.accomodationId ? 'Not found' : 'N/A'),
          accomodationPrice: accomodationTotal,
          accomodationId: x.accomodationDoc ? String(x.accomodationDoc._id) : '',
          fees: {
            vehicle: vehicleFee,
            transit: transitFee,
            parkAdults: Number(x.routeDoc.park_fee_adult || 0),
            parkChildren: Number(x.routeDoc.park_fee_child || 0),
            parkTotal,
            accomodation: accomodationTotal,
            adultUnit,
            childUnit,
          }
        };
      }),
      totals: result.totals,
    });
  } catch (err) { next(err); }
});

// Create itinerary
router.post('/itineraries', ensureAuth, async (req, res, next) => {
  try {
    const { title, clientName, startDate, adults, children, routeId, accomodationId, adult_price, child_price, inclusionsText, exclusionsText, profitPercent } = req.body;
    if (!title) { req.flash('error', 'Title is required.'); return res.redirect('/dashboard/itineraries/new'); }
    const routeIdsRaw = Array.isArray(routeId) ? routeId : [routeId];
    const accomodationIdsRaw = Array.isArray(accomodationId) ? accomodationId : [accomodationId];
    const adultPriceRaw = Array.isArray(adult_price) ? adult_price : [adult_price];
    const childPriceRaw = Array.isArray(child_price) ? child_price : [child_price];
    const dayInputs = routeIdsRaw
      .map((id, idx) => ({
        routeId: (id || '').trim(),
        accomodationId: (accomodationIdsRaw[idx] || '').trim(),
        adult_price: Number(adultPriceRaw[idx] || 0),
        child_price: Number(childPriceRaw[idx] || 0),
      }))
      .filter(d => d.routeId);

    if (!dayInputs.length) {
      req.flash('error', 'At least one route is required.');
      return res.redirect('/dashboard/itineraries/new');
    }

    const routeIds = [...new Set(dayInputs.map(d => d.routeId))];
    const accIds = [...new Set(dayInputs.map(d => d.accomodationId).filter(Boolean))];
    const [routes, accommodations] = await Promise.all([
      RouteModel.find({ _id: { $in: routeIds } }).lean(),
      Accommodation.find({ _id: { $in: accIds } }).lean(),
    ]);
    const routeById = new Map(routes.map(r => [String(r._id), r]));
    const accById = new Map(accommodations.map(a => [String(a._id), a]));

    const days = dayInputs.map(d => {
      const accDoc = d.accomodationId ? accById.get(d.accomodationId) : null;
      return {
        routeId: d.routeId,
        accomodation: {
          name: accDoc ? accDoc.accomodation_name : 'N/A',
          adult_price: Number(d.adult_price || 0),
          child_price: Number(d.child_price || 0),
        }
      };
    });

    const pax = { adults: Number(adults || 0), children: Number(children || 0) };
    const { totals } = computeItineraryTotals(routes, days, pax);
    const inclusionsList = textAreaToList(inclusionsText);
    const exclusionsList = textAreaToList(exclusionsText);
    const profitPct = normalizePercent(profitPercent || 0);
    const profitAmount = Number(totals.grand || 0) * (profitPct / 100);
    const overview = await generateItineraryOverview({
      title,
      clientName,
      pax,
      days: days.map(d => ({
        route: routeById.get(d.routeId) || { name: 'TBD', description: '' },
        accomodation: d.accomodation
      }))
    });

    const doc = await Itinerary.create({
      title: title.trim(),
      clientName: (clientName || '').trim() || undefined,
      startDate: startDate ? new Date(startDate) : null,
      pax,
      days: days.map(d => ({ route: d.routeId, accomodation: d.accomodation })),
      totals,
      inclusions: inclusionsList,
      exclusions: exclusionsList,
      profit: { percent: profitPct, amount: profitAmount },
      overview,
    });
    return res.redirect(`/dashboard/itineraries/${doc._id}`);
  } catch (err) { next(err); }
});
// Edit itinerary form
router.get('/itineraries/:id/edit', ensureAuth, async (req, res, next) => {
  try {
    const [itDoc, routes, accomodations] = await Promise.all([
      Itinerary.findById(req.params.id).populate('days.route').lean(),
      RouteModel.find({}).sort({ day: 1, name: 1 }).lean(),
      Accommodation.find({}).sort({ accomodation_name: 1 }).lean(),
    ]);
    if (!itDoc) {
      req.flash('error', 'Itinerary not found.');
      return res.redirect('/dashboard/itineraries');
    }

    const accIdByName = new Map(accomodations.map(a => [a.accomodation_name, String(a._id)]));
    const dayRoutes = Array.isArray(itDoc.days) ? itDoc.days : [];
    let formDays = dayRoutes.map((day, idx) => {
      const routeId = day && day.route ? String(day.route._id) : '';
      const accomodationName = day?.accomodation?.name || '';
      const accomodationId = accomodationName ? (accIdByName.get(accomodationName) || '') : '';
      return {
        dayValue: idx + 1,
        routeId,
        accomodationId,
        accomodationName,
        accomodationMissing: Boolean(accomodationName && !accomodationId),
        adult_price: Number(day?.accomodation?.adult_price || 0),
        child_price: Number(day?.accomodation?.child_price || 0),
      };
    });
    if (!formDays.length) {
      formDays = [{ dayValue: 1, routeId: '', accomodationId: '', accomodationName: '' }];
    }
    const missingRoutesCount = formDays.filter(d => !d.routeId).length;
    const inclusionsText = (itDoc.inclusions || []).join('\n');
    const exclusionsText = (itDoc.exclusions || []).join('\n');
    const profitPercent = normalizePercent(itDoc.profit?.percent || 0);

    res.render('itineraries/edit', {
      title: `Edit Itinerary • ${itDoc.title}`,
      description: 'Update itinerary details and day plan.',
      keywords: 'itinerary, edit, update',
      page: 'itineraries',
      it: itDoc,
      routes,
      accomodations,
      formDays,
      missingRoutesCount,
      inclusionsText,
      exclusionsText,
      profitPercent,
    });
  } catch (err) { next(err); }
});

// Update itinerary
router.post('/itineraries/:id/edit', ensureAuth, async (req, res, next) => {
  try {
    const itineraryId = req.params.id;
    const redirectBack = `/dashboard/itineraries/${itineraryId}/edit`;
    const itDoc = await Itinerary.findById(itineraryId).lean();
    if (!itDoc) {
      req.flash('error', 'Itinerary not found.');
      return res.redirect('/dashboard/itineraries');
    }

    const { title, clientName, startDate, adults, children, inclusionsText, exclusionsText, profitPercent } = req.body;
    if (!title || !title.trim()) {
      req.flash('error', 'Title is required.');
      return res.redirect(redirectBack);
    }

    const toArray = (field) => {
      if (typeof field === 'undefined') return [];
      return Array.isArray(field) ? field : [field];
    };
    const dayArr = toArray(req.body.day);
    const routeIdArr = toArray(req.body.routeId);
    const accomodationIdArr = toArray(req.body.accomodationId);
    const adultPriceArr = toArray(req.body.adult_price);
    const childPriceArr = toArray(req.body.child_price);

    const rows = dayArr
      .map((d, i) => ({
        day: Number(d || i + 1),
        routeId: (routeIdArr[i] || '').trim(),
        accomodationId: (accomodationIdArr[i] || '').trim(),
        adult_price: Number(adultPriceArr[i] || 0),
        child_price: Number(childPriceArr[i] || 0),
      }))
      .filter(r => r.routeId);

    if (!rows.length) {
      req.flash('error', 'Please include at least one day with a route.');
      return res.redirect(redirectBack);
    }

    const routeIds = [...new Set(rows.map(r => r.routeId))];
    const accomodationIds = [...new Set(rows.map(r => r.accomodationId).filter(Boolean))];
    const [routesFound, accomodationsFound] = await Promise.all([
      RouteModel.find({ _id: { $in: routeIds } }).lean(),
      Accommodation.find({ _id: { $in: accomodationIds } }).lean(),
    ]);

    const routeById = new Map(routesFound.map(r => [String(r._id), r]));
    const accById = new Map(accomodationsFound.map(a => [String(a._id), a]));

    const missingRouteSelections = rows.filter(r => !routeById.has(r.routeId));
    if (missingRouteSelections.length) {
      req.flash('error', 'One or more selected routes were not found. Please refresh the page and try again.');
      return res.redirect(redirectBack);
    }

    const daysNorm = rows
      .map(r => ({
        day: Number.isFinite(r.day) && r.day > 0 ? r.day : 1,
        routeDoc: routeById.get(r.routeId),
        accomodationDoc: r.accomodationId ? accById.get(r.accomodationId) : null,
        accomodationId: r.accomodationId,
        adult_price: Number(r.adult_price || 0),
        child_price: Number(r.child_price || 0),
      }))
      .filter(x => x.routeDoc)
      .sort((a, b) => a.day - b.day);

    if (!daysNorm.length) {
      req.flash('error', 'Unable to process itinerary days. Please try again.');
      return res.redirect(redirectBack);
    }

    const pax = { adults: Number(adults || 0), children: Number(children || 0) };
    const daysForCalc = daysNorm.map(x => ({
      routeId: x.routeDoc._id,
      accomodation: {
        name: x.accomodationDoc ? x.accomodationDoc.accomodation_name : (x.accomodationId ? 'Not found' : 'N/A'),
        adult_price: Number(x.adult_price || 0),
        child_price: Number(x.child_price || 0),
      }
    }));
    const { totals } = computeItineraryTotals(daysNorm.map(x => x.routeDoc), daysForCalc, pax);
    const inclusionsList = textAreaToList(inclusionsText);
    const exclusionsList = textAreaToList(exclusionsText);
    const profitPct = normalizePercent(profitPercent || 0);
    const profitAmount = Number(totals.grand || 0) * (profitPct / 100);
    let overview = itDoc.overview;
    if (!overview || !overview.trim()) {
      overview = await generateItineraryOverview({
        title,
        clientName,
        pax,
        days: daysNorm.map(d => ({
          route: d.routeDoc,
          accomodation: d.accomodation,
        })),
      });
    }

    await Itinerary.updateOne(
      { _id: itineraryId },
      {
        $set: {
          title: title.trim(),
          clientName: (clientName || '').trim() || undefined,
          startDate: startDate ? new Date(startDate) : null,
          pax,
          days: daysForCalc.map(d => ({ route: d.routeId, accomodation: d.accomodation })),
          totals,
          inclusions: inclusionsList,
          exclusions: exclusionsList,
          profit: { percent: profitPct, amount: profitAmount },
          overview,
        }
      }
    );
    req.flash('success', 'Itinerary updated successfully.');
    return res.redirect(`/dashboard/itineraries/${itineraryId}`);
  } catch (err) { next(err); }
});

// Show itinerary
router.get('/itineraries/:id', ensureAuth, async (req, res, next) => {
  try {
    const it = await Itinerary.findById(req.params.id).populate('days.route').lean();
    if (!it) {
      req.flash('error', 'Itinerary not found.');
      return res.redirect('/dashboard/itineraries');
    }
    const missingRoutes = (it.days || []).filter(d => !d.route).length;
    if (missingRoutes) {
      req.flash('error', 'Itinerary references routes that no longer exist. Restore the missing route(s) from Admin → Routes and try again.');
      return res.redirect('/dashboard/itineraries');
    }
    res.render('itineraries/show', {
      title: `Itinerary • ${it.title}`,
      description: 'Itinerary details and totals.',
      keywords: 'itinerary, details, totals',
      page: 'itineraries',
      it,
    });
  } catch (err) { next(err); }
});

// Print-friendly itinerary view
router.get('/itineraries/:id/print', ensureAuth, async (req, res, next) => {
  try {
    const it = await Itinerary.findById(req.params.id).populate('days.route').lean();
    if (!it) {
      req.flash('error', 'Itinerary not found.');
      return res.redirect('/dashboard/itineraries');
    }
    const missingRoutes = (it.days || []).filter(d => !d.route).length;
    if (missingRoutes) {
      req.flash('error', 'Itinerary references routes that no longer exist. Restore the missing route(s) from Admin → Routes and try again.');
      return res.redirect('/dashboard/itineraries');
    }

    const formattedDays = (it.days || []).map((day, idx) => ({
      index: idx + 1,
      title: day.route.name,
      description: day.route.description,
      image: day.route.image || '',
      accommodation: day.accomodation?.name || 'N/A',
    }));

    const accomodationList = [...new Set((it.days || []).map(d => d.accomodation?.name).filter(Boolean))];
    const defaultInclusions = [
      'Private 4x4 Land Cruiser with pop-up roof, unlimited mileage.',
      'Professional English-speaking safari guide throughout the trip.',
      'Accommodation as listed per day with full-board meals.',
      'All park and conservation entry fees for listed destinations.',
      'Airport pickup and drop-off plus bottled drinking water on drives.',
      '24/7 ground support and emergency assistance team.',
      'Domestic flight segments specified in the itinerary (if applicable).',
    ];
    const defaultExclusions = [
      'International flights to/from Tanzania.',
      'Entry visas, travel insurance, and personal medical coverage.',
      'Alcoholic beverages and lodge extras not listed as included.',
      'Extra accommodation nights beyond the confirmed itinerary.',
      'Tips and gratuities for guides, drivers, and lodge staff.',
      'Personal expenses such as laundry, souvenirs, and phone calls.',
    ];
    const inclusions = (it.inclusions && it.inclusions.length) ? it.inclusions : defaultInclusions;
    const exclusions = (it.exclusions && it.exclusions.length) ? it.exclusions : defaultExclusions;

    res.render('itineraries/print', {
      layout: false,
      title: `${it.title} • Print Preview`,
      it,
      formattedDays,
      accomodationList,
      inclusions,
      exclusions,
    });
  } catch (err) { next(err); }
});

// Delete itinerary
router.post('/itineraries/:id/delete', ensureAuth, async (req, res, next) => {
  try {
    const doc = await Itinerary.findById(req.params.id).lean();
    if (!doc) {
      req.flash('error', 'Itinerary not found.');
      return res.redirect('/dashboard/itineraries');
    }
    await Itinerary.deleteOne({ _id: req.params.id });
    req.flash('info', 'Itinerary deleted.');
    return res.redirect('/dashboard/itineraries');
  } catch (err) { next(err); }
});

module.exports = router;
