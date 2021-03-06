const config = require('../config/config')
const models = require('../models')
const utils = require('../utils')
const jwt = require('../utils/jwt')

module.exports = {
    get: {
        all: async (req, res) => {
            const users = await models.User.find({})
            res.json(users)
        },
        one: async (req, res, next) => {
            try {
                const { id } = req.params
                const user = await models.User
                    .findOne({ _id: id })
                // .populate('orders')
                // .populate('cartItems')
                res.json(user)

            } catch (err) {
                next(err)
            }
        },
        isAuth: async (req, res, next) => {
            try {
                const authToken = req.cookies[config.authCookieName]
                const { _id: id } = await utils.jwt.verifyToken(authToken)
                const user = await models.User.findOne({ _id: id }).select('-password')
                res.json(user)

            } catch (err) {
                res.status(401).send({ msg: 'Unauthorized!' })
            }
        }
    },
    post: {
        register: async (req, res, next) => {
            try {
                const { username, email, password, rePassword } = req.body

                if (password !== rePassword) {
                    res.status(406).send({ msg: 'Both passwords should match!' })
                    return
                }

                const createdUser = await models.User.create({ username, email, password })

                res.json(createdUser)
            } catch (err) {
                if (err.code === 11000 && err.name === 'MongoError') {
                    res.status(422).send({ msg: err.message })
                    return
                }
                next(err)
            }
        },
        login: async (req, res, next) => {
            try {
                const { email, password } = req.body

                const user = await models.User.findOne({ email })

                if (!user) {
                    res.status(401).send({ msg: 'Invalid email!' })
                    return
                }

                if (!await user.matchPassword(password)) {
                    res.status(401).send({ msg: 'Invalid password!' })
                    return
                }

                if (user.status === 'Banned') {
                    res.status(403).send({ msg: 'You are banned!' })
                    return
                }
                const token = jwt.createToken(user)

                res.cookie(config.authCookieName, token, { maxAge: 3600000 })

                res.json(user)
            } catch (err) {
                next(err)
            }
        },
        logout: async (req, res, next) => {
            res
                .clearCookie(config.authCookieName)
                .send({ msg: 'Logged out successfully!' })
        }
    },
    delete: async (req, res, next) => {
        try {
            const { id } = req.params
            const deletionInfo = await models.User.deleteOne({ _id: id })
            res.json(deletionInfo)

        } catch (err) {
            next(err)
        }
    },
    ban: async (req, res, next) => {
        try {
            const { id } = req.params
            const { status } = req.body
            const updatedStatus = await models.User.updateOne({ _id: id }, { status })
            res.json(updatedStatus)

        } catch (err) {
            next(err)
        }
    }
}