const validator = require("../utils/validator");
const productModel = require("../models/productModel");
const userModel = require("../models/userModel");
const cartModel = require("../models/cartModel");
const orderModel = require("../models/orderModel");

const orderCreation = async(req, res) => {
    try {
        const userId = req.params.userId;
        const requestBody = req.body;

        if (!validator.isValidRequestBody(requestBody)) {
            return res
                .status(400)
                .send({
                    status: false,
                    message: "Invalid request body. Please provide the the input to proceed.",
                });
        }
        //Extract parameters
        const { cartId, cancellable, status } = requestBody;

        if (!validator.isValidObjectId(userId)) {
            return res
                .status(400)
                .send({ status: false, message: "Invalid userId in params." });
        }

        const searchUser = await userModel.findOne({ _id: userId });
        if (!searchUser) {
            return res.status(400).send({
                status: false,
                message: `user doesn't exists for ${userId}`,
            });
        }

        if (!cartId) {
            return res.status(400).send({
                status: false,
                message: `Cart doesn't exists for ${userId}`,
            });
        }
        if (!validator.isValidObjectId(cartId)) {
            return res.status(400).send({
                status: false,
                message: `Invalid cartId in request body.`,
            });
        }
        const searchCartDetails = await cartModel.findOne({
            _id: cartId,
            userId: userId,
        });
        if (!searchCartDetails) {
            return res.status(400).send({
                status: false,
                message: `Cart doesn't belongs to ${userId}`,
            });
        }

        if (cancellable) {
            if (typeof cancellable != "boolean") {
                return res.status(400).send({
                    status: false,
                    message: `Cancellable must be either 'true' or 'false'.`,
                });
            }
        }

        if (status) {
            if (!validator.isValidStatus(status)) {
                return res.status(400).send({
                    status: false,
                    message: `Status must be among ['pending','completed','cancelled'].`,
                });
            }
        }
        if (!searchCartDetails.items.length) {
            return res.status(202).send({
                status: false,
                message: `Order already placed for this cart. Please add some products in cart to make an order.`,
            });
        }
        //adding quantity of every products
        const reducer = (previousValue, currentValue) =>
            previousValue + currentValue;
        let totalQuantity = searchCartDetails.items
            .map((x) => x.quantity)
            .reduce(reducer);

        const orderDetails = {
            userId: userId,
            items: searchCartDetails.items,
            totalPrice: searchCartDetails.totalPrice,
            totalItems: searchCartDetails.totalItems,
            totalQuantity: totalQuantity,
            cancellable,
            status,
        };
        const savedOrder = await orderModel.create(orderDetails);

        //Empty the cart after the successfull order
        await cartModel.findOneAndUpdate({ _id: cartId, userId: userId }, {
            $set: {
                items: [],
                totalPrice: 0,
                totalItems: 0,
            },
        });
        return res
            .status(200)
            .send({ status: true, message: "Order placed.", data: savedOrder });
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
};

const updateOrder = async(req, res) => {
    try {
        const userId = req.params.userId;
        const requestBody = req.body;

        if (!validator.isValidRequestBody(requestBody)) {
            return res
                .status(400)
                .send({
                    status: false,
                    message: "Invalid request body. Please provide the the input to proceed.",
                });
        }
        //extract params
        const { orderId, status } = requestBody;

        if (!validator.isValidObjectId(userId)) {
            return res
                .status(400)
                .send({ status: false, message: "Invalid userId in params." });
        }

        const searchUser = await userModel.findOne({ _id: userId });
        if (!searchUser) {
            return res.status(400).send({
                status: false,
                message: `user doesn't exists for ${userId}`,
            });
        }
        if (!orderId) {
            return res.status(400).send({
                status: false,
                message: `Order doesn't exists for ${orderId}`,
            });
        }

        isOrderBelongsToUser = await orderModel.findOne({ userId: userId });
        if (!isOrderBelongsToUser) {
            return res.status(400).send({
                status: false,
                message: `Order doesn't belongs to ${userId}`,
            });
        }

        if (!status) {
            return res
                .status(400)
                .send({
                    status: true,
                    message: "Mandatory paramaters not provided. Please enter current status of the order.",
                    data: order,
                });
        }

        if (isOrderBelongsToUser["cancellable"] == true) {
            if (isOrderBelongsToUser['status'] == 'pending') {
                const updateStatus = await orderModel.findOneAndUpdate({ _id: orderId }, {
                    $set: { status: status }
                }, { new: true })

                return res.status(200).send({ status: true, message: `Successfully updated the order details.`, data: updateStatus })
            }

            if (isOrderBelongsToUser['status'] == 'completed') {
                return res.status(400).send({ status: true, message: `Order is already in completed status, hence can't update/cancel it.` })
            }
            if (isOrderBelongsToUser['status'] == 'cancelled') {
                return res.status(400).send({ status: true, message: `Order is already in cancelled status, hence can't update it.` })
            }
        }

        if (isOrderBelongsToUser["cancellable"] == false) {
            if (isOrderBelongsToUser['status'] == 'cancelled') {
                return res
                    .status(400)
                    .send({ status: false, message: "Unable to cancel the order due to the non-cancellable policy." });
            }
            if (isOrderBelongsToUser['status'] == 'pending') {
                if (status) {
                    if (!(status == 'pending' || status == 'completed')) {
                        return res.status(400).send({
                            status: true,
                            message: `This order is already in Non-cancellable status.`
                        })
                    }
                    const updateStatus = await orderModel.findOneAndUpdate({ _id: orderId }, {
                        $set: { status: status }
                    }, { new: true })

                    return res.status(200).send({ status: true, message: `Successfully updated the order details.`, data: updateStatus })
                }

            }
            if (isOrderBelongsToUser['status'] == 'completed') {
                if (status) {
                    if ((status == 'pending')) {
                        return res.status(400).send({
                            status: true,
                            message: `This order is already in completed status hence the status cannot be changed/updated.`
                        })
                    }
                }

            }

        }
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
}

module.exports = {
    orderCreation,
    updateOrder,
};