import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';

dotenv.config();

// Determines which data of the user object should be stored in the session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Use the stored ID (or user object) to look up the user in the database
passport.deserializeUser((user, done) => {
  done(null, user);
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // Dynamically points to your backend URL + the callback route
    callbackURL: `nowere-back.onrender.com/auth/google/callback`, 
    passReqToCallback: true
  },
  (request, accessToken, refreshToken, profile, done) => {
    // This profile contains the user's Google name, email, and photo.
    // In a production app, you would typically find or create a user in your DB here.
    return done(null, profile);
  }
));

export default passport;