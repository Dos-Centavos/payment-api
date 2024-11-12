/*
  REST API library for /payment route.
*/

// Public npm libraries.
import Router from 'koa-router'

// Local libraries.
import PaymentRESTControllerLib from './controller.js'

import Validators from '../middleware/validators.js'

class PaymentRouter {
  constructor (localConfig = {}) {
    // Dependency Injection.
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of Adapters library required when instantiating PostEntry REST Controller.'
      )
    }
    this.useCases = localConfig.useCases
    if (!this.useCases) {
      throw new Error(
        'Instance of Use Cases library required when instantiating PostEntry REST Controller.'
      )
    }

    const dependencies = {
      adapters: this.adapters,
      useCases: this.useCases
    }

    // Encapsulate dependencies.
    this.paymentRESTControllerLib = new PaymentRESTControllerLib(dependencies)
    this.validators = new Validators()

    // Instantiate the router and set the base route.
    const baseUrl = '/payments'
    this.router = new Router({ prefix: baseUrl })

    // Bind functions
    this.attach = this.attach.bind(this)
    this.createPayment = this.createPayment.bind(this)
    this.getAll = this.getAll.bind(this)
    this.getById = this.getById.bind(this)
    this.cancelPayment = this.cancelPayment.bind(this)
    this.deletePayment = this.deletePayment.bind(this)
  }

  attach (app) {
    if (!app) {
      throw new Error(
        'Must pass app object when attaching REST API controllers.'
      )
    }

    // Define the routes and attach the controller.
    this.router.post('/', this.createPayment)
    this.router.get('/', this.getAll)
    this.router.get('/:id', this.getById)
    this.router.put('/cancel/:id', this.cancelPayment)
    this.router.delete('/:id', this.deletePayment)

    // Attach the Controller routes to the Koa app.
    app.use(this.router.routes())
    app.use(this.router.allowedMethods())
  }

  async createPayment (ctx, next) {
    await this.validators.ensureUser(ctx, next)
    await this.paymentRESTControllerLib.createPayment(ctx, next)
    return true
  }

  async getAll (ctx, next) {
    await this.validators.ensureUser(ctx, next)
    await this.paymentRESTControllerLib.getPayments(ctx, next)
    return true
  }

  async getById (ctx, next) {
    await this.validators.ensureUser(ctx, next)
    await this.paymentRESTControllerLib.getPayment(ctx, next)
    return true
  }

  async cancelPayment (ctx, next) {
    await this.validators.ensureUser(ctx, next)
    await this.paymentRESTControllerLib.getPayment(ctx, next)
    await this.paymentRESTControllerLib.cancelPayment(ctx, next)
    return true
  }

  async deletePayment (ctx, next) {
    await this.validators.ensureUser(ctx, next)
    await this.paymentRESTControllerLib.getPayment(ctx, next)
    await this.paymentRESTControllerLib.deletePayment(ctx, next)
    return true
  }
}

export default PaymentRouter
