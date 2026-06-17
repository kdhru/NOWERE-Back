/**
 * Authentication middleware
 * Ensures user is authenticated before accessing protected routes
 */
export const isAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: "Login required" });
};
