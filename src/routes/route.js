const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController')
const middleware = require('../middlewares/auth')

router.post('/register', userController.userCreation)
router.post('/login', userController.userLogin)
router.get('/user/:userId/profile', middleware.userAuth, userController.getProfile)
router.put('/user/:userId/profile', middleware.userAuth, userController.updateProfile)

module.exports = router;