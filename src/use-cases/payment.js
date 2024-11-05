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
    this.BchWallet = this.adapters.wallet.BchWallet

    // Bind functions.
    this.createPayment = this.createPayment.bind(this)
    this.getPayment = this.getPayment.bind(this)
    this.getAllPayments = this.getAllPayments.bind(this)
    this.cancelPayment = this.cancelPayment.bind(this)
    this.deletePayment = this.deletePayment.bind(this)
  }

  // Create payment model
  async createPayment (paymentObj) {
    try {
      // Input Validation

      const paymentEntity = this.PaymentEntity.validate(paymentObj)
      const payment = new this.PaymentModel(paymentEntity)

      payment.createdAt = new Date().getTime()

      const walletConfig = {
        authPass: this.config.authPass,
        restURL: this.config.apiServer
      }

      const paymentInProgress = await this.PaymentModel.findOne({ userId: payment.userId, status: 'in-process' })
      // One payment with status 'in-process' is allowed per user
      if (paymentInProgress) {
        throw new Error('One payment is currently in process')
      }

      const bchWallet = new this.BchWallet(null, walletConfig)

      // Get the bch price in USD
      const bchToUSDPrice = await bchWallet.getUsd()

      const paymentData = this.config.paymentTypes[payment.type]
      // Payment type , define the amount to paid, and credits quantity to receive
      if (!paymentData) {
        throw new Error('Provided payment type not found!')
      }

      // payment price in BCH
      const paymentPriceBch = (paymentData.priceUSD / bchToUSDPrice).toFixed(8)

      // Convert BCH to Sats
      const paymentPriceSats = bchWallet.bchjs.BitcoinCash.toSatoshi(paymentPriceBch)

      payment.priceUSD = paymentData.priceUSD
      payment.priceSats = paymentPriceSats
      payment.creditsQuantity = paymentData.creditsQuantity

      payment.status = 'in-process'

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
}

export default PaymentUseCases
