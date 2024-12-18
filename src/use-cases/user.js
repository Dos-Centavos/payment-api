/*
  This library contains business-logic for dealing with users. Most of these
  functions are called by the /user REST API endpoints.
*/

import UserEntity from '../entities/user.js'

import wlogger from '../adapters/wlogger.js'
import config from '../../config/index.js'

class UserLib {
  constructor (localConfig = {}) {
    // console.log('User localConfig: ', localConfig)
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of adapters must be passed in when instantiating User Use Cases library.'
      )
    }
    this.config = config
    // Encapsulate dependencies
    this.UserEntity = new UserEntity()
    this.UserModel = this.adapters.localdb.Users
    this.PaymentModel = this.adapters.localdb.Payments
    this.BchWallet = this.adapters.wallet.BchWallet

    // Bind functions.
    this.getWalletSequence = this.getWalletSequence.bind(this)
    this.reviewPayments = this.reviewPayments.bind(this)
  }

  // Create a new user model and add it to the Mongo database.
  async createUser (userObj) {
    try {
      // Input Validation

      const userEntity = this.UserEntity.validate(userObj)
      const user = new this.UserModel(userEntity)

      // Enforce default value of 'user'
      user.type = 'user'

      // Assign derivated wallet
      const { walletAddress, walletIndex } = await this.getWalletSequence()
      user.walletAddress = walletAddress
      user.walletIndex = walletIndex
      // Save the new user model to the database.
      await user.save()

      // Generate a JWT token for the user.
      const token = user.generateToken()

      // Convert the database model to a JSON object.
      const userData = user.toJSON()
      // console.log('userData: ', userData)

      // Delete the password property.
      delete userData.password
      console.log('userData ', userData)
      return { userData, token }
    } catch (err) {
      console.log('createUser() error: ', err)
      wlogger.error('Error in lib/users.js/createUser()')
      throw err
    }
  }

  // Returns an array of all user models in the Mongo database.
  async getAllUsers () {
    try {
      // Get all user models. Delete the password property from each model.
      const users = await this.UserModel.find({}, '-password')

      return users
    } catch (err) {
      wlogger.error('Error in lib/users.js/getAllUsers()')
      throw err
    }
  }

  // Get the model for a specific user.
  async getUser (params) {
    try {
      const { id } = params

      const user = await this.UserModel.findById(id, '-password')

      // Throw a 404 error if the user isn't found.
      if (!user) {
        const err = new Error('User not found')
        err.status = 404
        throw err
      }

      return user
    } catch (err) {
      // console.log('Error in getUser: ', err)

      if (err.status === 404) throw err

      // Return 422 for any other error
      err.status = 422
      err.message = 'Unprocessable Entity'
      throw err
    }
  }

  async updateUser (existingUser, newData) {
    try {
      // console.log('existingUser: ', existingUser)
      // console.log('newData: ', newData)

      // Input Validation
      // Optional inputs, but they must be strings if included.
      if (newData.email && typeof newData.email !== 'string') {
        throw new Error("Property 'email' must be a string!")
      }
      if (newData.name && typeof newData.name !== 'string') {
        throw new Error("Property 'name' must be a string!")
      }
      if (newData.password && typeof newData.password !== 'string') {
        throw new Error("Property 'password' must be a string!")
      }

      // Save a copy of the original user type.
      const userType = existingUser.type
      // console.log('userType: ', userType)

      // If user 'type' property is sent by the client
      if (newData.type) {
        if (typeof newData.type !== 'string') {
          throw new Error("Property 'type' must be a string!")
        }

        // Unless the calling user is an admin, they can not change the user type.
        if (userType !== 'admin') {
          throw new Error("Property 'type' can only be changed by Admin user")
        }
      }

      // Overwrite any existing data with the new data.
      Object.assign(existingUser, newData)

      // Save the changes to the database.
      await existingUser.save()

      // Delete the password property.
      delete existingUser.password

      return existingUser
    } catch (err) {
      wlogger.error('Error in lib/users.js/updateUser()')
      throw err
    }
  }

  async deleteUser (user) {
    try {
      await user.remove()
    } catch (err) {
      wlogger.error('Error in lib/users.js/deleteUser()')
      throw err
    }
  }

  // Used to authenticate a user. If the login and password salt match a user in
  // the database, then it returns the user model. The Koa REST API uses the
  // Passport library for this functionality. This function is used to
  // authenticate users who login via the JSON RPC.
  async authUser (login, passwd) {
    try {
      // console.log('login: ', login)
      // console.log('passwd: ', passwd)

      const user = await this.UserModel.findOne({ email: login })
      if (!user) {
        throw new Error('User not found')
      }

      const isMatch = await user.validatePassword(passwd)

      if (!isMatch) {
        throw new Error('Login credential do not match')
      }

      return user
    } catch (err) {
      // console.error('Error in users.js/authUser()')
      console.log('')
      throw err
    }
  }

  // Obtain the following sequence of the derivation of wallets assigned to users
  async getWalletSequence () {
    try {
      let walletIndex = 0

      const users = await this.UserModel.find({})
      const latUser = users[users.length - 1]
      if (latUser) {
        walletIndex = latUser.walletIndex + 1
      }
      const walletConfig = {
        authPass: this.config.authPass,
        restURL: this.config.apiServer,
        hdPath: `m/44'/245'/0'/0/${walletIndex}`
      }

      const derivatedWallet = await this.adapters.wallet._instanceWallet(
        this.config.pearsonMnemonic,
        walletConfig
      )

      return {
        walletAddress: derivatedWallet.walletInfo.cashAddress,
        walletIndex
      }
    } catch (error) {
      console.log('Error on use-cases/user/getWalletSequence()', error)
      throw error
    }
  }

  // Gets the wallet address of a user searched for the pearsonId.
  async getUserAddressByPearsonId (inObj = {}) {
    try {
      const { id } = inObj
      if (!id || typeof id !== 'string') throw new Error('id must be a string')

      const user = await this.UserModel.findOne({ pearsonId: id })
      if (!user) {
        throw new Error('user not found!')
      }

      const data = {
        address: user.walletAddress,
        lastPaymentTime: user.lastPaymentTime,
        lastReviewTime: user.lastReviewTime
      }
      return data
    } catch (error) {
      console.log('Error on use-cases/user/getWalletSequence()', error)
      throw error
    }
  }

  // Control pending user payments.
  // Once the date of a detected payment is greater than the date of the last review, it will proceed to review the user's balance.
  async reviewPayments () {
    try {
      // Fetch user to review payment in the last 1 minutes.
      const users = await this.UserModel.find()

      // Filter users who need payment review.
      const usersToReview = users.filter((val) => {
        return val.lastPaymentTime > val.lastReviewTime
      })
      console.log('users to review payment', usersToReview)
      for (let i = 0; i < usersToReview.length; i++) {
        try {
          const user = usersToReview[i]
          // Get payment model
          const payment = await this.PaymentModel.findOne({
            userId: user._id,
            status: 'in-process'
          })
          if (!payment) {
            console.log(
              `user ${user._id} does not have any payment with status 'in-process'. Skipping`
            )
            continue
          }

          // Instantiate user wallet
          const walletConfig = {
            authPass: this.config.authPass,
            restURL: this.config.apiServer,
            hdPath: `m/44'/245'/0'/0/${user.walletIndex}`
          }
          const userWallet = await this.adapters.wallet._instanceWallet(
            this.config.pearsonMnemonic,
            walletConfig
          )
          // Get user balance.
          const balance = await userWallet.getBalance()
          console.log(
            `Payment ${payment._id} price : ${payment.priceSats} Sats`
          )
          console.log(`user ${user._id} balance : ${balance} Sats`)

          const margin = payment.priceSats * 0.02
          if (balance < (payment.priceSats - margin)) {
            console.log(
              `Insufficient balance for payment price ${payment.priceSats} Sats. Skipping`
            )
            continue
          }

          // Send balance to app address
          console.log(`Seding balance to : ${this.config.receiverAddress}`)
          await userWallet.initialize()

          // NOTE: it should send the payment price amount instead all the balance?
          const tx = await userWallet.sendAll(this.config.receiverAddress)
          console.log(`Tx : ${tx}`)

          // Add credits to user.
          await this.adapters.tokenTiger.addCredits({
            qty: payment.creditsQuantity,
            userId: user.pearsonId
          })

          // Save the timestamp of the last payment processed
          user.lastReviewTime = new Date().getTime()
          payment.status = 'completed'
          await user.save()
          await payment.save()
        } catch (error) {
          continue
        }
      }
      return true
    } catch (error) {
      console.log('Error on use-cases/user/reviewPayment()', error)
      throw error
    }
  }
}

export default UserLib
