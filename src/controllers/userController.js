const userModel = require('../models/userModel')
const validator = require('../utils/validator')
const config = require('../utils/awsConfig')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const saltRounds = 10


const userCreation = async(req, res) => {
    try {
        let files = req.files;
        let requestBody = req.body;
        let {
            fname,
            lname,
            email,
            profileImage,
            phone,
            password,
            address
        } = requestBody

        if (!validator.isValidRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: "please provide valid request body" })
        }
        if (!validator.isValid(fname)) {
            return res.status(400).send({ status: false, message: "fname is required" })
        }
        if (!validator.isValid(lname)) {
            return res.status(400).send({ status: false, message: "lname is required" })
        }
        if (!validator.isValid(email)) {
            return res.status(400).send({ status: false, message: "email is required" })
        }
        const isEmailAleadyUsed = await userModel.findOne({ email })
        if (isEmailAleadyUsed) {
            return res.status(400).send({
                status: false,
                message: `${email} is alraedy in use. Please try another email Id.`
            })
        }

        //validating email using RegEx.
        if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email))
            return res.status(400).send({ status: false, message: "Invalid Email id." })

        if (!validator.isValidRequestBody(files)) {
            return res.status(400).send({ status: false, message: "Profile Image is required" })
        }
        if (!validator.isValid(phone)) {
            return res.status(400).send({ status: false, message: "phone number is required" })
        }
        const isPhoneAleadyUsed = await userModel.findOne({ phone })
        if (isPhoneAleadyUsed) {
            return res.status(400).send({
                status: false,
                message: `${phone} is already in use, Please try a new phone number.`
            })
        }

        //validating phone number of 10 digits only.
        if (!(/^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[6789]\d{9}$/.test(phone))) return res.status(400).send({ status: false, message: "Phone number must be a valid Indian number." })

        if (!validator.isValid(password)) {
            return res.status(400).send({ status: false, message: "password is required" })
        }
        if (password.length < 8 || password.length > 15) {
            return res.status(400).send({ status: false, message: "Password must be of 8-15 letters." })
        }
        if (!validator.isValid(address)) {
            return res.status(400).send({ status: false, message: "Address is required" })
        }
        //shipping address validation
        if (address.shipping.street) {
            if (!validator.isValidRequestBody(address.shipping.street)) {
                return res.status(400).send({
                    status: false,
                    message: "Shipping address's Street Required"
                })
            }
        } else {
            return res.status(400).send({ status: false, message: " Invalid request parameters. Shipping address's street cannot be empty" })
        }

        if (address.shipping.city) {
            if (!validator.isValidRequestBody(address.shipping.city)) {
                return res.status(400).send({
                    status: false,
                    message: "Shipping address city Required"
                })
            }
        } else {
            return res.status(400).send({ status: false, message: "Invalid request parameters. Shipping address's city cannot be empty" })
        }
        if (address.shipping.pincode) {
            if (!validator.isValidRequestBody(address.shipping.pincode)) {
                return res.status(400).send({
                    status: false,
                    message: "Shipping address's pincode Required"
                })
            }
        } else {
            return res.status(400).send({ status: false, message: "Invalid request parameters. Shipping address's pincode cannot be empty" })
        }
        // Billing Adress validation
        if (address.billing.street) {
            if (!validator.isValidRequestBody(address.billing.street)) {
                return res.status(400).send({
                    status: false,
                    message: "Billing address's Street Required"
                })
            }
        } else {
            return res.status(400).send({ status: false, message: " Invalid request parameters. Billing address's street cannot be empty" })
        }
        if (address.billing.city) {
            if (!validator.isValidRequestBody(address.billing.city)) {
                return res.status(400).send({
                    status: false,
                    message: "Billing address's city Required"
                })
            }
        } else {
            return res.status(400).send({ status: false, message: "Invalid request parameters. Billing address's city cannot be empty" })
        }
        if (address.billing.pincode) {
            if (!validator.isValidRequestBody(address.billing.pincode)) {
                return res.status(400).send({
                    status: false,
                    message: "Billing address's pincode Required "
                })
            }
        } else {
            return res.status(400).send({ status: false, message: "Invalid request parameters. Billing address's pincode cannot be empty" })
        }
        profileImage = await config.uploadFile(files[0]);
        const encryptedPassword = await bcrypt.hash(password, saltRounds)
        userData = {
            fname,
            lname,
            email,
            profileImage,
            phone,
            password: encryptedPassword,
            address
        }
        const saveUserData = await userModel.create(userData);
        return res
            .status(201)
            .send({
                status: true,
                message: "user created successfully.",
                data: saveUserData
            });
    } catch (err) {
        return res.status(500).send({
            status: false,
            message: "Error is : " + err
        })
    }
}


const userLogin = async function(req, res) {
    try {
        const requestBody = req.body;

        // Extract params
        const { email, password } = requestBody;

        // Validation starts
        if (!validator.isValidRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: 'Invalid request parameters. Please provide login details' })
        }
        if (!validator.isValid(requestBody.email.trim())) {
            return res.status(400).send({ status: false, message: 'Email Id is required' })
        }

        if (!validator.isValid(requestBody.password)) {
            return res.status(400).send({ status: false, message: 'Password is required' })
        }
        // Validation ends

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(401).send({ status: false, message: `Invalid login credentials` });
        }
        let hashedPassword = user.password
        const encryptedPassword = await bcrypt.compare(password, hashedPassword)
        if (!encryptedPassword) return res.status(401).send({ status: false, message: `Invalid login credentials` });

        const userId = user._id
        const token = await jwt.sign({
            userId: userId,
            iat: Math.floor(Date.now() / 1000), //time of issuing the token.
            exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 7 //setting token expiry time limit.
        }, 'group3-Project5-Products_management')

        return res.status(200).send({
            status: true,
            message: `user login successfull `,
            data: {
                userId,
                token
            }
        });
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
}

const getProfile = async(req, res) => {
    try {
        const userId = req.params.userId
        const userIdFromToken = req.userId

        //validation starts
        if (!validator.isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "Invalid userId in params." })
        }
        //validation ends

        const findUserProfile = await userModel.findOne({ _id: userId })
        if (!findUserProfile) {
            return res.status(400).send({
                status: false,
                message: `User doesn't exists by ${userId}`
            })
        }
        //Checking the authorization of the user -> Whether user's Id matches with the book creater's Id or not.
        if (userIdFromToken != findUserProfile._id) {
            return res.status(403).send({
                status: false,
                message: "Unauthorized access."
            })
        }

        return res.status(200).send({ status: true, message: "Profile found successfully.", data: findUserProfile })
    } catch (err) {
        return res.status(500).send({
            status: false,
            message: "Error is: " + err.message
        })
    }
}

const updateProfile = async(req, res) => {
    try {
        let files = req.files
        let requestBody = req.body
        let params = req.params
        let userId = params.userId
        let userIdFromToken = req.userId

        // if (!validator.isValidRequestBody(requestBody)) {
        //     res.status(400).send({ status: false, message: 'No paramateres passed. book unmodified' })
        //     return
        // }
        if (!validator.isValidObjectId(userId)) {
            res.status(400).send({ status: false, message: `${userId} is not a valid user id` })
            return
        }
        if (!validator.isValidObjectId(userIdFromToken)) {
            return res.status(400).send({ status: false, message: `${userIdFromToken} Unauthorized access! Owner info doesn't match ` })
        }
        const findUser = await userModel.findOne({ _id: userId })
        if (!findUser) {
            return res.status(400).send({
                status: false,
                message: `User doesn't exists by ${userId}`
            })
        }
        if (findUser._id.toString() !== userIdFromToken) {
            res.status(401).send({ status: false, message: `Unauthorized access! Owner info doesn't match` });
            return
        }
        // Extract params
        let { fname, lname, email, phone, password, address, profileImage } = requestBody;
        if (!validator.validString(fname)) {
            return res.status(400).send({ status: false, message: 'fname Required' })
        }
        if (fname) {
            if (!validator.isValid(fname)) {
                return res.status(400).send({ status: false, message: "Invalid request parameter, please provide fname" })
            }
        }
        if (!validator.validString(lname)) {
            return res.status(400).send({ status: false, message: 'lname Required' })
        }
        if (lname) {
            if (!validator.isValid(lname)) {
                return res.status(400).send({ status: false, message: "Invalid request parameter, please provide lname" })
            }
        }
        if (!validator.validString(email)) {
            return res.status(400).send({ status: false, message: 'email Required' })
        }
        if (email) {
            if (!validator.isValid(email)) {
                return res.status(400).send({ status: false, message: "Invalid request parameter, please provide email" })
            }
            if (!/^\w+([\.-]?\w+)@\w+([\.-]?\w+)(\.\w{2,3})+$/.test(email)) {
                return res.status(400).send({ status: false, message: `Email should be a valid email address` });
            }
            let isEmailAlredyPresent = await UserModel.findOne({ email: email })
            if (isEmailAlredyPresent) {
                return res.status(400).send({ status: false, message: `Email Already Present` });
            }
        }
        if (!validator.validString(phone)) {
            return res.status(400).send({ status: false, message: 'phone Required' })
        }
        if (phone) {
            if (!validator.isValid(phone)) {
                return res.status(400).send({ status: false, message: "Invalid request parameter, please provide Phone" })
            }
            if (!/^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[6789]\d{9}$/.test(phone)) {
                return res.status(400).send({ status: false, message: `Mobile should be a valid number` });
            }
            let isPhoneAlredyPresent = await userModel.findOne({ phone: phone })
            if (isPhoneAlredyPresent) {
                return res.status(400).send({ status: false, message: `Phone Number Already Present` });
            }
        }
        if (!validator.validString(password)) {
            return res.status(400).send({ status: false, message: 'password Required' })
        }
        let tempPassword = password
        if (tempPassword) {
            if (!validator.isValid(tempPassword)) {
                return res.status(400).send({ status: false, message: "Invalid request parameter, please provide password" })
            }
            if (!(tempPassword.length >= 8 && tempPassword.length <= 15)) {
                return res.status(400).send({ status: false, message: "Password should be Valid min 8 and max 15 " })
            }
            var PassWord = await bcrypt.hash(tempPassword, saltRounds)
        }
        //!----------
        if (address) {
            let x = JSON.stringify(address)
            let y = JSON.parse(x)
            if (validator.isValidRequestBody(y)) {
                if (y.hasOwnProperty('shipping')) {
                    if (y.shipping.hasOwnProperty('street')) {
                        if (!validator.isValid(y.shipping.street)) {
                            return res.status(400).send({ status: false, message: " Invalid request parameters. Please provide Street" });
                        }
                    }
                    if (y.shipping.hasOwnProperty('city')) {
                        if (!validator.isValid(y.shipping.city)) {
                            return res.status(400).send({ status: false, message: " Invalid request parameters. Please provide City" });
                        }
                    }
                    if (y.shipping.hasOwnProperty('pincode')) {
                        if (!validator.isValid(y.shipping.pincode)) {
                            return res.status(400).send({ status: false, message: " Invalid request parameters. Please provide pincode" });
                        }
                    }
                    var shippingStreet = address.shipping.street
                    var shippingCity = address.shipping.city
                    var shippingPincode = address.shipping.pincode
                }
            } else {
                return res.status(400).send({ status: false, message: " Invalid request parameters. Address cannot be empty" });
            }
        }
        if (address) {
            let x = JSON.stringify(address)
            let y = JSON.parse(x)
            if (validator.isValidRequestBody(y)) {
                if (y.hasOwnProperty('billing')) {
                    if (y.billing.hasOwnProperty('street')) {
                        if (!validator.isValid(y.billing.street)) {
                            return res.status(400).send({ status: false, message: " Invalid request parameters. Please provide  b Street" });
                        }
                    }
                    if (y.billing.hasOwnProperty('city')) {
                        if (!validator.isValid(y.billing.city)) {
                            return res.status(400).send({ status: false, message: " Invalid request parameters. Please provide  b City" });
                        }
                    }
                    if (y.billing.hasOwnProperty('pincode')) {
                        if (!validator.isValid(y.billing.pincode)) {
                            return res.status(400).send({ status: false, message: " Invalid request parameters. Please provide  b pincode" });
                        }
                    }
                    var billingStreet = address.billing.street
                    var billingCity = address.billing.city
                    var billingPincode = address.billing.pincode
                }
            } else {
                return res.status(400).send({ status: false, message: " Invalid request parameters. Address cannot be empty" });
            }
        }
        if (files) {
            if (validator.isValidRequestBody(files)) {
                if (!(files && files.length > 0)) {
                    return res.status(400).send({ status: false, message: "Invalid request parameter, please provide profile image" })
                }
                profileImage = await config.uploadFile(files[0])
            }
        }
        ///---------------------------------------Validation Ends --------------------------------//
        let updatedBookData = await userModel.findOneAndUpdate({ _id: userId }, {
            $set: {
                fname: fname,
                lname: lname,
                email: email,
                profileImage: profileImage,
                phone: phone,
                password: PassWord,
                'address.shipping.street': shippingStreet,
                'address.shipping.city': shippingCity,
                'address.shipping.pincode': shippingPincode,
                'address.billing.street': billingStreet,
                'address.billing.city': billingCity,
                'address.billing.pincode': billingPincode
            }
        }, { new: true })
        res.status(201).send({ status: true, data: updatedBookData })
    } catch (err) {
        return res.status(500).send({
            status: false,
            message: "Error is: " + err.message
        })
    }
}

module.exports = {
    userCreation,
    userLogin,
    getProfile,
    updateProfile
}