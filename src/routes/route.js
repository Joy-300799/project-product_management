const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController')
const productController = require('../controllers/productController')

const middleware = require('../middlewares/auth')

//User's APIs
router.post('/register', userController.userCreation)
router.post('/login', userController.userLogin)
router.get('/user/:userId/profile', middleware.userAuth, userController.getProfile)
router.put('/user/:userId/profile', middleware.userAuth, userController.updateProfile)

//Product's APIs
router.post('/products', productController.productCreation)
router.get('/products', productController.getAllProducts)
router.get('/products/:productId', productController.getProductsById)
router.put('/products/:productId', productController.updateProduct)
router.delete('/products/:productId', productController.deleteProduct)





module.exports = router;