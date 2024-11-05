/*
  REST API Controller library for the /payments route
*/

import wlogger from '../../../adapters/wlogger.js'

class PaymentRESTControllerLib {
  constructor (localConfig = {}) {
    // Dependency Injection.
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of Adapters library required when instantiating /payments REST Controller.'
      )
    }
    this.useCases = localConfig.useCases
    if (!this.useCases) {
      throw new Error(
        'Instance of Use Cases library required when instantiating /payments REST Controller.'
      )
    }

    // Encapsulate dependencies
    this.PaymentModel = this.adapters.localdb.Payments

    // Bind functions
    this.createPayment = this.createPayment.bind(this)
    this.getPayment = this.getPayment.bind(this)
    this.getPayments = this.getPayments.bind(this)
    this.cancelPayment = this.cancelPayment.bind(this)
    this.deletePayment = this.deletePayment.bind(this)
    this.handleError = this.handleError.bind(this)
  }

  async createPayment (ctx) {
    try {
      const paymentObj = ctx.request.body.payment

      const payment = await this.useCases.payment.createPayment(paymentObj)

      ctx.body = {
        payment
      }
    } catch (err) {
      this.handleError(ctx, err)
    }
  }

  async getPayments (ctx) {
    try {
      const payments = await this.useCases.payment.getAllPayments()

      ctx.body = { payments }
    } catch (err) {
      wlogger.error('Error in payments/controller.js/getPayments(): ', err)
      this.handleError(ctx, err)
    }
  }

  async getPayment (ctx, next) {
    try {
      const payment = await this.useCases.payment.getPayment(ctx.params)

      ctx.body = {
        payment
      }
    } catch (err) {
      this.handleError(ctx, err)
    }

    if (next) {
      return next()
    }
  }

  async cancelPayment (ctx) {
    try {
      const existingPayment = ctx.body.payment
      const payment = await this.useCases.payment.cancelPayment(existingPayment)

      ctx.body = {
        payment
      }
    } catch (err) {
      ctx.throw(422, err.message)
    }
  }

  async deletePayment (ctx) {
    try {
      const payment = ctx.body.payment

      await this.useCases.payment.deletePayment(payment)

      ctx.status = 200
      ctx.body = {
        success: true
      }
    } catch (err) {
      this.handleError(ctx, err)
    }
  }

  // DRY error handler
  handleError (ctx, err) {
    // If an HTTP status is specified by the buisiness logic, use that.
    if (err.status) {
      if (err.message) {
        ctx.throw(err.status, err.message)
      } else {
        ctx.throw(err.status)
      }
    } else {
      // By default use a 422 error if the HTTP status is not specified.
      ctx.throw(422, err.message)
    }
  }
}

export default PaymentRESTControllerLib
