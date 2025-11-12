const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

function initPassport(passport) {
  passport.use(
    new LocalStrategy(
      { usernameField: 'username', passwordField: 'password' },
      async (username, password, done) => {
        try {
          // Local prototype: plain-text password check against `name` field as username
          const user = await User.findOne({ name: username });
          if (!user) return done(null, false, { message: 'Username or password is incorrect.' });
          if (password !== user.password) return done(null, false, { message: 'Password is incorrect.' });
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
      // Exclude plain password from user object attached to req
      const user = await User.findById(id).select('-password').lean();
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
}

module.exports = initPassport;
