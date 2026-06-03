const router = require('express').Router();
const auth = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');


// AUTH
/*{"email": "sury@example.com",
  "password": "mypassword123" }*/
  //some secret key jawn
router.post('/login', auth.login);

/*{"refreshToken": "REFRESH_TOKEN_HERE" }*/
router.post('/refresh', auth.refresh);
    

/* in headers put key as Authorizationa dn value as Bearer (key)*/
router.post('/logout', authMiddleware, auth.logout);


/*{"token": "RESET_TOKEN_HERE"}*/
router.post('/google', auth.googleLogin);

// PASSWORD RESET
/*{"email": "Email"}*/
//now actually send the email and check if account actually exists
router.post('/forgot-password', auth.forgotPassword);

/*{  "token": "RESET_TOKEN",
  "newPassword": "newStrongPassword123"}*/
router.post('/reset-Password', auth.resetPassword);


module.exports = router;
