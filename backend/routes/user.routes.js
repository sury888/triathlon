const router = require('express').Router();
const user = require('../controllers/userController');
const { authMiddleware, ownerOnly, adminOnly } = require('../middleware/auth');

// Registration (public)
router.post('/', user.createUser);

// Authenticated + owner-only routes
router.get('/:id', authMiddleware, user.getUser);
router.put('/:id', authMiddleware, ownerOnly, user.updateUser);

// Account management
router.post('/:id/changePassword', authMiddleware, ownerOnly, user.changePassword);
router.patch('/:id/updateProfile', authMiddleware, ownerOnly, user.updateProfile);
router.delete('/:id/deleteAccount', authMiddleware, ownerOnly, user.deleteAccount);

// Settings
router.get('/:id/settings', authMiddleware, ownerOnly, user.getSettings);
router.patch('/:id/settings', authMiddleware, ownerOnly, user.updateSettings);

// Preferences
router.get('/:id/preferences', authMiddleware, ownerOnly, user.getPreferences);
router.patch('/:id/preferences', authMiddleware, ownerOnly, user.updatePreferences);

// Security
router.get('/:id/security', authMiddleware, ownerOnly, user.getSecurity);

// Activity
router.get('/:id/activity', authMiddleware, ownerOnly, user.getActivity);

// Favorite leagues
router.post('/:id/favoriteLeague/:leagueId', authMiddleware, ownerOnly, user.toggleFavoriteLeague);
router.get('/:id/favoriteLeagues', authMiddleware, ownerOnly, user.getFavoriteLeagues);

// Admin: promote/demote users
router.patch('/:id/role', authMiddleware, adminOnly, user.updateRole);

module.exports = router;
