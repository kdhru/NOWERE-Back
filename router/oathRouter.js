import express from 'express';
import passport from 'passport';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// 1. Trigger Google Login
router.get('/auth/google', passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account' // Forces the account selector to appear
}));

// 2. Google Callback 
// Uses template literals to pull the Frontend URL from .env
router.get('/auth/google/callback', 
    passport.authenticate('google', { 
        failureRedirect: '/auth/login' 
    }),
    (req, res) => {
        res.json({ success: true, user: req.user });
    }
);

// 3. Check login status
router.get("/api/user-status", (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ loggedIn: true, user: req.user });
    } else {
        res.json({ loggedIn: false });
    }
});

// 4. Logout Route
router.get("/auth/logout", (req, res) => {
    req.logout((err) => {
        if (err) return res.status(500).json({ error: "Logout failed" });
        res.redirect(`${FRONTEND_URL}/`);
    });
});

export default router;