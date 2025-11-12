const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const { ensureGuest } = require('../middlewares/authCheck');

const router = express.Router();

// Render: Login
router.get('/login', ensureGuest, (req, res) => {
  res.render('auth/login', {
    title: 'Ingia kwenye akaunti',
    description: 'Ingia ili kufikia dashibodi yako ya Tanzania Adv. Group.',
    keywords: 'ingia, akaunti, Tanzania Adv. Group',
    page: 'auth-login',
  });
});


// HTMX: Login submit
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      const msg = info?.message || 'Invalid credentials.';
      // HTMX response returns fragment, non-HTMX falls back to flash + redirect
      if (req.get('HX-Request')) {
        return res.render('fragments/auth-message', { layout: false, kind: 'danger', messages: [msg] });
      }
      try { req.flash('error', msg); } catch (_) {}
      return res.redirect('/auth/login');
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      if (req.get('HX-Request')) {
        res.set('HX-Redirect', '/dashboard');
        return res.status(200).end();
      }
      return res.redirect('/dashboard');
    });
  })(req, res, next);
});

// HTMX: Logout
router.post('/logout', (req, res) => {
  const redirectTo = '/';
  const done = () => {
    const isHtmx = req.get('HX-Request');
    if (isHtmx) {
      res.set('HX-Redirect', redirectTo);
      return res.end();
    }
    return res.redirect(redirectTo);
  };

  try {
    req.logout?.(() => {
      req.session?.destroy?.(() => {
        res.clearCookie(process.env.SESSION_NAME || 'sb.sid');
        done();
      });
    });
  } catch (e) {
    done();
  }
});



module.exports = router;
