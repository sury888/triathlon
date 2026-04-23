const router = require('express').Router();
const user = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');

// CRUD
//{name, email, password, confirmPassword}
//improve validation right now it does email and password length but should also check for valid email format and strong password
//add password confirmation
router.post('/', user.createUser);

router.get('/', user.listUsers);
router.get('/:id', user.getUser);

//{name, email}
//maybe ask for password or authorized change idk
//validation needs to be implemented
router.put('/:id', user.updateUser);

//{userId}
router.delete('/:id', user.deleteUser);

// ACCOUNT MANAGEMENT   
//{oldPassword, newPassword}
//add password confirmation
//need token jawn to test
router.post('/:id/changePassword', authMiddleware, user.changePassword);

//{name, email, avatar, bio}
//need token 
router.patch('/:id/updateProfile', authMiddleware, user.updateProfile);
router.delete('/:id/deleteAccount', authMiddleware, user.deleteAccount);

// SETTINGS
router.get('/:id/settings', authMiddleware, user.getSettings);

//{avatar, bio}
router.patch('/:id/settings', authMiddleware, user.updateSettings);

// PREFERENCES
router.get('/:id/preferences', authMiddleware, user.getPreferences);

//{theme, notifications}
//need to change what kind of notifications and where
router.patch('/:id/preferences', authMiddleware, user.updatePreferences);

// SECURITY
router.get('/:id/security', authMiddleware, user.getSecurity);

// ACTIVITY
router.get('/:id/activity', authMiddleware, user.getActivity);




module.exports = router;
