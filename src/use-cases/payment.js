/*
  This library contains business-logic for dealing with users payment. Most of these
  functions are called by the /payments REST API endpoints.
*/

import PaymentEntity from '../entities/payment.js'

import wlogger from '../adapters/wlogger.js'
import config from '../../config/index.js'

class PaymentUseCases {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of adapters must be passed in when instantiating Payment Use Cases library.'
      )
    }
    this.config = config
    // Encapsulate dependencies
    this.PaymentEntity = new PaymentEntity()
    this.PaymentModel = this.adapters.localdb.Payments
    this.UserModel = this.adapters.localdb.Users
    this.BchWallet = this.adapters.wallet.BchWallet

    // Bind functions.
    this.createPayment = this.createPayment.bind(this)
    this.getPayment = this.getPayment.bind(this)
    this.getAllPayments = this.getAllPayments.bind(this)
    this.cancelPayment = this.cancelPayment.bind(this)
    this.deletePayment = this.deletePayment.bind(this)
    this.renewTokenTigerJWT = this.renewTokenTigerJWT.bind(this)
    this.verifyStripePayment = this.verifyStripePayment.bind(this)
    this.completeStripePayment = this.completeStripePayment.bind(this)
  }

  // Create payment model
  async createPayment (paymentObj) {
    try {
      // Input Validation
      const { stripeUiMode, ...paymentFields } = paymentObj || {}

      const paymentEntity = this.PaymentEntity.validate(paymentFields)
      const payment = new this.PaymentModel(paymentEntity)

      payment.createdAt = new Date().getTime()

      const paymentInProgress = await this.PaymentModel.findOne({ userId: payment.userId, status: 'in-process' })
      // One payment with status 'in-process' is allowed per user
      if (paymentInProgress) {
        throw new Error('One payment is currently in process')
      }

      const paymentData = this.config.paymentTypes[payment.type]
      // Payment type , define the amount to paid, and credits quantity to receive
      if (!paymentData) {
        throw new Error('Provided payment type not found!')
      }

      payment.priceUSD = paymentData.priceUSD
      payment.creditsQuantity = paymentData.creditsQuantity
      payment.status = 'in-process'

      if (payment.paymentMethod === 'Stripe') {
        payment.priceSats = 0
        await payment.save()

        if (stripeUiMode === 'embedded') {
          const intent = await this.adapters.stripe.createPaymentIntent({
            paymentId: payment._id,
            priceUSD: payment.priceUSD,
            creditsQuantity: payment.creditsQuantity
          })

          payment.stripePaymentIntentId = intent.id
          await payment.save()

          payment.clientSecret = intent.client_secret
          return payment
        }

        const session = await this.adapters.stripe.createCheckoutSession({
          paymentId: payment._id,
          priceUSD: payment.priceUSD,
          creditsQuantity: payment.creditsQuantity
        })

        payment.stripeSessionId = session.id
        await payment.save()

        payment.checkoutUrl = session.url
        return payment
      }

      const walletConfig = {
        authPass: this.config.authPass,
        restURL: this.config.apiServer
      }

      const bchWallet = new this.BchWallet(null, walletConfig)

      // Get the bch price in USD
      const bchToUSDPrice = await bchWallet.getUsd()

      // payment price in BCH
      const paymentPriceBch = (paymentData.priceUSD / bchToUSDPrice).toFixed(8)

      // Convert BCH to Sats
      const paymentPriceSats = bchWallet.bchjs.BitcoinCash.toSatoshi(paymentPriceBch)

      payment.priceSats = paymentPriceSats

      await payment.save()

      return payment
    } catch (err) {
      console.log('createPayment() error: ', err)
      wlogger.error('Error in use-cases/payment.js/createPayment()')
      throw err
    }
  }

  // Returns an array of all payment models in the Mongo database.
  async getAllPayments () {
    try {
      // Get all payment models
      const payments = await this.PaymentModel.find({})

      return payments
    } catch (err) {
      wlogger.error('Error in use-cases/payment.js/getAllPayments()')
      throw err
    }
  }

  // Get the model for a specific payment.
  async getPayment (params) {
    try {
      const { id } = params

      const payment = await this.PaymentModel.findById(id)

      // Throw a 404 error if the payment isn't found.
      if (!payment) {
        const err = new Error('Payment not found')
        err.status = 404
        throw err
      }

      return payment
    } catch (err) {
      if (err.status === 404) throw err

      // Return 422 for any other error
      err.status = 422
      err.message = 'Unprocessable Entity'
      throw err
    }
  }

  // Set payment status to  'cancelled'
  async cancelPayment (payment) {
    try {
      if (payment?.paymentMethod === 'Stripe') {
        if (payment.stripePaymentIntentId) {
          await this.adapters.stripe.cancelPaymentIntent(
            payment.stripePaymentIntentId
          )
        } else if (payment.stripeSessionId) {
          await this.adapters.stripe.expireCheckoutSession(payment.stripeSessionId)
        }
      }

      payment.status = 'cancelled'
      payment.completedAt = new Date().getTime()
      await payment.save()

      return payment
    } catch (err) {
      wlogger.error('Error in use-cases/payment.js/updatePayment()')
      throw err
    }
  }

  // Delete payment model
  async deletePayment (payment) {
    try {
      await payment.remove()
    } catch (err) {
      wlogger.error('Error in use-cases/payment.js/deletePayment()')
      throw err
    }
  }

  // Renew Token Tiger JWT
  async renewTokenTigerJWT () {
    try {
      // Renew JWT.
      const jwt = await this.adapters.tokenTiger.auth()
      console.log('Token Tiger JWT updated! ')

      return jwt
    } catch (error) {
      console.log('Error on use-cases/payment.js/renewTokenTigerJWT()', error)
      throw error
    }
  }

  async verifyStripePayment (payment) {
    try {
      if (payment.paymentMethod !== 'Stripe') {
        throw new Error('Payment is not a Stripe payment')
      }

      if (payment.status === 'completed') {
        return payment
      }

      if (payment.stripePaymentIntentId) {
        const intent = await this.adapters.stripe.retrievePaymentIntent(
          payment.stripePaymentIntentId
        )

        if (intent.status !== 'succeeded') {
          const err = new Error('Stripe payment has not been completed')
          err.status = 422
          throw err
        }

        return await this.completeStripePayment(intent)
      }

      if (!payment.stripeSessionId) {
        throw new Error('Payment is missing Stripe session ID')
      }

      const session = await this.adapters.stripe.retrieveCheckoutSession(
        payment.stripeSessionId
      )

      if (session.payment_status !== 'paid') {
        const err = new Error('Stripe payment has not been completed')
        err.status = 422
        throw err
      }

      return await this.completeStripePayment(session)
    } catch (err) {
      console.log('verifyStripePayment() error: ', err)
      wlogger.error('Error in use-cases/payment.js/verifyStripePayment()')
      throw err
    }
  }

  async completeStripePayment (stripeResource) {
    try {
      const paymentId = stripeResource.metadata?.paymentId
      if (!paymentId) {
        throw new Error('Stripe resource is missing paymentId metadata')
      }

      const payment = await this.PaymentModel.findById(paymentId)
      if (!payment) {
        throw new Error(`Payment ${paymentId} not found`)
      }

      if (payment.status === 'completed') {
        return payment
      }

      if (payment.paymentMethod !== 'Stripe') {
        throw new Error('Payment is not a Stripe payment')
      }

      const user = await this.UserModel.findById(payment.userId)
      if (!user) {
        throw new Error(`User ${payment.userId} not found`)
      }

      await this.adapters.tokenTiger.addCredits({
        qty: payment.creditsQuantity,
        userId: user.pearsonId
      })

      payment.status = 'completed'
      payment.completedAt = new Date().getTime()
      if (stripeResource.object === 'payment_intent') {
        payment.stripePaymentIntentId = stripeResource.id
      } else {
        payment.stripeSessionId = stripeResource.id
      }
      console.log('Payment Completed', payment)
      await payment.save()

      return payment
    } catch (err) {
      console.log('completeStripePayment() error: ', err)
      wlogger.error('Error in use-cases/payment.js/completeStripePayment()')
      throw err
    }
  }
}

export default PaymentUseCases
