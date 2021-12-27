const validator = require('../utils/validator')
const config = require('../utils/awsConfig')
const productModel = require('../models/productModel')
const currencySymbol = require("currency-symbol-map")

const productCreation = async function(req, res) {
    try {
        let files = req.files;
        let requestBody = req.body;
        let productImage;

        if (!validator.isValidRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: "Please provide valid request body" })
        }
        let {
            title,
            description,
            price,
            currencyId,
            currencyFormat,
            isFreeShipping,
            style,
            availableSizes,
            installments
        } = requestBody

        if (!validator.isValid(title)) {
            return res.status(400).send({ status: false, message: "Title is required" })
        }
        const istitleAleadyUsed = await productModel.findOne({ title })
        if (istitleAleadyUsed) {
            return res.status(400).send({
                status: false,
                message: `${title} is alraedy in use. Please use another title.`
            })
        }

        if (files) {
            if (validator.isValidRequestBody(files)) {
                if (!(files && files.length > 0)) {
                    return res.status(400).send({ status: false, message: "Please provide product image" })
                }
                productImage = await config.uploadFile(files[0])
            }
        }

        if (!validator.isValid(description)) {
            return res.status(400).send({ status: false, message: "Description is required" })
        }

        if (!validator.isValid(price)) {
            return res.status(400).send({ status: false, message: "Price is required" })
        }

        if (!validator.isValid(currencyId)) {
            return res.status(400).send({ status: false, message: "currencyId is required" })
        }

        if (currencyId != "INR") {
            return res.status(400).send({ status: false, message: "currencyId should be INR" })
        }

        if (!validator.isValid(currencyFormat)) {
            currencyFormat = currencySymbol('INR')
        }
        currencyFormat = currencySymbol('INR')


        if (style) {
            if (!validator.validString(style)) {
                return res.status(400).send({ status: false, message: "style is required" })
            }
        }

        if (installments) {
            if (!validator.isValid(installments)) {
                return res.status(400).send({ status: false, message: "installments required" }) //Doubt wheater this validation is required or not...
            }
        }
        if (installments) {
            if (!validator.validInstallment(installments)) {
                return res.status(400).send({ status: false, message: "installments can't be a decimal number " }) //Doubt wheater this validation is required or not...
            }
        }

        if (isFreeShipping) {
            if (!(isFreeShipping != true)) {
                return res.status(400).send({ status: false, message: "isFreeShipping must be a boolean value" })
            }
        }

        productImage = await config.uploadFile(files[0]);

        const newProductData = {
            title,
            description,
            price,
            currencyId,
            currencyFormat: currencyFormat,
            isFreeShipping,
            style,
            availableSizes,
            installments,
            productImage: productImage
        }
        if (availableSizes) {
            let array = availableSizes.split(",").map(x => x.trim())

            for (let i = 0; i < array.length; i++) {
                if (!(["S", "XS", "M", "X", "L", "XXL", "XL"].includes(array[i]))) {
                    return res.status(400).send({ status: false, message: `availableSizes should be among ${["S", "XS", "M", "X", "L", "XXL", "XL"].join(', ')}` })
                }
            }
            if (Array.isArray(array)) {
                newProductData['availableSizes'] = array
            }
        }
        const saveProductDetails = await productModel.create(newProductData)
        return res.status(201).send({ status: true, message: "Successfully saved product details", data: saveProductDetails })

    } catch (err) {
        return res.status(500).send({
            status: false,
            message: "Error is : " + err
        })
    }
}

const getAllProducts = async function(req, res) {
    try {
        const filterQuery = { isDeleted: false }
        const queryParams = req.query;

        if (validator.isValidRequestBody(queryParams)) {
            const { size, name, priceGreaterThan, priceLessThan, priceSort } = queryParams;


            if (validator.isValid(size)) {
                filterQuery['availableSizes'] = size
            }

            if (validator.isValid(name)) {
                filterQuery['title'] = {}
                filterQuery['title']['$regex'] = name
                filterQuery['title']['$options'] = '$i'
            }

            if (validator.isValid(priceGreaterThan)) {

                if (!(!isNaN(Number(priceGreaterThan)))) {
                    return res.status(400).send({ status: false, message: `priceGreaterThan should be a valid number` })
                }
                if (priceGreaterThan <= 0) {
                    return res.status(400).send({ status: false, message: `priceGreaterThan should be a valid number` })
                }
                if (!Object.prototype.hasOwnProperty.call(filterQuery, 'price'))
                    filterQuery['price'] = {}
                filterQuery['price']['$gte'] = Number(priceGreaterThan)
                    //console.log(typeof Number(priceGreaterThan))
            }

            if (validator.isValid(priceLessThan)) {

                if (!(!isNaN(Number(priceLessThan)))) {
                    return res.status(400).send({ status: false, message: `priceLessThan should be a valid number` })
                }
                if (priceLessThan <= 0) {
                    return res.status(400).send({ status: false, message: `priceLessThan should be a valid number` })
                }
                if (!Object.prototype.hasOwnProperty.call(filterQuery, 'price'))
                    filterQuery['price'] = {}
                filterQuery['price']['$lte'] = Number(priceLessThan)
                    //console.log(typeof Number(priceLessThan))
            }

            if (validator.isValid(priceSort)) {

                if (!((priceSort == 1) || (priceSort == -1))) {
                    return res.status(400).send({ status: false, message: `priceSort should be 1 or -1 ` })
                }

                const products = await productModel.find(filterQuery).sort({ price: priceSort })
                    // console.log(products)
                if (Array.isArray(products) && products.length === 0) {
                    return res.status(404).send({ statuproductss: false, message: 'No Product found' })
                }

                return res.status(200).send({ status: true, message: 'Product list', data: products })
            }
        }

        const products = await productModel.find(filterQuery)

        if (Array.isArray(products) && products.length === 0) {
            return res.status(404).send({ statuproductss: false, message: 'No Product found' })
        }

        return res.status(200).send({ status: true, message: 'Product list', data: products })
    } catch (error) {
        return res.status(500).send({ success: false, error: error.message });
    }
}


const getProductsById = async function(req, res) {
    try {
        const productId = req.params.productId

        if (!validator.isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: `${productId} is not a valid product id` })
        }

        const product = await productModel.findOne({ _id: productId, isDeleted: false });

        if (!product) {
            return res.status(404).send({ status: false, message: `product does not exists` })
        }

        return res.status(200).send({ status: true, message: 'Product found successfully', data: product })
    } catch (err) {
        return res.status(500).send({
            status: false,
            message: "Error is : " + err
        })
    }
}

const updateProduct = async function(req, res) {
    try {
        const requestBody = req.body
        const params = req.params
        const productId = params.productId

        // Validation stats
        if (!validator.isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: `${productId} is not a valid product id` })
        }

        const product = await productModel.findOne({ _id: productId, isDeleted: false })

        if (!product) {
            return res.status(404).send({ status: false, message: `product not found` })
        }

        if (!(validator.isValidRequestBody(requestBody) || req.files)) {
            return res.status(400).send({ status: false, message: 'No paramateres passed. product unmodified', data: product })
        }

        // Extract params
        const { title, description, price, currencyId, isFreeShipping, style, availableSizes, installments } = requestBody;

        const updatedProductDetails = {}

        if (validator.isValid(title)) {

            const isTitleAlreadyUsed = await productModel.findOne({ title, _id: { $ne: productId } });

            if (isTitleAlreadyUsed) {
                return res.status(400).send({ status: false, message: `${title} title is already used` })
            }

            if (!updatedProductDetails.hasOwnProperty('title'))
                updatedProductDetails['title'] = title
        }

        if (validator.isValid(description)) {
            if (!updatedProductDetails.hasOwnProperty('description'))
                updatedProductDetails['description'] = description
        }

        if (validator.isValid(price)) {

            if (!(!isNaN(Number(price)))) {
                return res.status(400).send({ status: false, message: `Price should be a valid number` })
            }

            if (price <= 0) {
                return res.status(400).send({ status: false, message: `Price should be a valid number` })
            }

            if (!updatedProductDetails.hasOwnProperty('price'))
                updatedProductDetails['price'] = price
        }

        if (validator.isValid(currencyId)) {

            if (!(currencyId == "INR")) {
                return res.status(400).send({ status: false, message: 'currencyId should be a INR' })
            }

            if (!updatedProductDetails.hasOwnProperty('currencyId'))
                updatedProductDetails['currencyId'] = currencyId;
        }

        if (validator.isValid(isFreeShipping)) {

            if (!((isFreeShipping === "true") || (isFreeShipping === "false"))) {
                return res.status(400).send({ status: false, message: 'isFreeShipping should be a boolean value' })
            }

            if (!updatedProductDetails.hasOwnProperty('isFreeShipping'))
                updatedProductDetails['isFreeShipping'] = isFreeShipping
        }

        let productImage = req.files;
        if ((productImage && productImage.length > 0)) {

            let updatedproductImage = await config.uploadFile(productImage[0]);

            if (!updatedProductDetails.hasOwnProperty('productImage'))
                updatedProductDetails['productImage'] = updatedproductImage
        }

        if (validator.isValid(style)) {

            if (!updatedProductDetails.hasOwnProperty('style'))
                updatedProductDetails['style'] = style
        }

        if (availableSizes) {
            let sizesArray = availableSizes.split(",").map(x => x.trim())

            for (let i = 0; i < sizesArray.length; i++) {
                if (!(["S", "XS", "M", "X", "L", "XXL", "XL"].includes(sizesArray[i]))) {
                    return res.status(400).send({ status: false, message: `availableSizes should be among ${["S", "XS", "M", "X", "L", "XXL", "XL"].join(', ')}` })
                }
            }
            if (!updatedProductDetails.hasOwnProperty(updatedProductDetails, '$addToSet'))
                updatedProductDetails['$addToSet'] = {}
            updatedProductDetails['$addToSet']['availableSizes'] = { $each: sizesArray }
        }

        if (validator.isValid(installments)) {

            if (!(!isNaN(Number(installments)))) {
                return res.status(400).send({ status: false, message: `installments should be a valid number` })
            }

            if (!updatedProductDetails.hasOwnProperty('installments'))
                updatedProductDetails['installments'] = installments
        }

        const updatedProduct = await productModel.findOneAndUpdate({ _id: productId }, updatedProductDetails, { new: true })

        return res.status(200).send({ status: true, message: 'Successfully updated product details.', data: updatedProduct });
    } catch (err) {
        return res.status(500).send({
            status: false,
            message: "Error is : " + err
        })
    }
}
const deleteProduct = async function(req, res) {
    try {
        const params = req.params
        const productId = params.productId

        if (!validator.isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: `${productId} is not a valid product id` })
        }

        const product = await productModel.findOne({ _id: productId })

        if (!product) {
            return res.status(400).send({ status: false, message: `Product doesn't exists by ${productId}` })
        }
        if (product.isDeleted == false) {
            await productModel.findOneAndUpdate({ _id: productId }, { $set: { isDeleted: true, deletedAt: new Date() } })
            return res.status(200).send({ status: true, message: `Product deleted successfully.` })
        }
        return res.status(400).send({ status: true, message: `Product has been already deleted.` })


    } catch (err) {
        return res.status(500).send({
            status: false,
            message: "Error is : " + err
        })
    }
}

module.exports = {
    productCreation,
    getAllProducts,
    getProductsById,
    updateProduct,
    deleteProduct
}