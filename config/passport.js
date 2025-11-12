const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

function initPassport(passport) {
  passport.use(
    new LocalStrategy(
      { usernameField: 'username', passwordField: 'password' },
      async (username, password, done) => {
        try {
          const user = await User.findOne({ username: username.toLowerCase() });
          if (!user) return done(null, false, { message: 'Jina la mtumiaji au nenosiri si sahihi.' });
          if (password !== user.password) return done(null, false, { message: 'Nenosiri si sahihi.' });
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id)
        .select('-passwordHash -resetToken -resetExpires')
        .lean();
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
}

module.exports = initPassport;
