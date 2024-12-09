/*
  This Controller library is concerned with timer-based functions that are
  kicked off periodicially.
*/

import config from '../../config/index.js'

class TimerControllers {
  constructor (localConfig = {}) {
    // Dependency Injection.
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of Adapters library required when instantiating Timer Controller libraries.'
      )
    }
    this.useCases = localConfig.useCases
    if (!this.useCases) {
      throw new Error(
        'Instance of Use Cases library required when instantiating Timer Controller libraries.'
      )
    }

    this.debugLevel = localConfig.debugLevel

    // Encapsulate dependencies
    this.config = config

    // Bind 'this' object to all subfunctions.
    this.reviewPayments = this.reviewPayments.bind(this)
    this.renewTokenTigerJWT = this.renewTokenTigerJWT.bind(this)

    this.reviewTime = 30000 // 30seg
    this.renewTime = 60000 * 60 * 6 // 6hr

    // this.startTimers()
  }

  // Start all the time-based controllers.
  startTimers () {
    // Any new timer control functions can be added here. They will be started
    // when the server starts.
    this.reviewPaymentTimer = setInterval(this.reviewPayments, this.reviewTime)
    this.renewJWTTimer = setInterval(this.renewTokenTigerJWT, this.renewTime)

    return true
  }

  stopTimers () {
    clearInterval(this.reviewPaymentTimer)
  }

  // Review all payment that need it
  async reviewPayments () {
    try {
      clearInterval(this.reviewPaymentTimer)

      await this.useCases.user.reviewPayments()
      /**
       * Proccess payments
       *
       */
      this.reviewPaymentTimer = setInterval(this.reviewPayments, this.reviewTime)
      return true
    } catch (err) {
      console.error('Error in reviewPayment(): ', err)
      this.reviewPaymentTimer = setInterval(this.reviewPayments, this.reviewTime)

      // Note: Do not throw an error. This is a top-level function.
      return false
    }
  }

  // Renew Token Tiger JWT
  async renewTokenTigerJWT () {
    try {
      clearInterval(this.renewJWTTimer)

      await this.useCases.payment.renewTokenTigerJWT()

      this.renewJWTTimer = setInterval(this.renewTokenTigerJWT, this.renewTime)
      return true
    } catch (err) {
      console.error('Error in timer-controller/renewTokenTigerJWT(): ', err)
      this.renewJWTTimer = setInterval(this.renewTokenTigerJWT, this.renewTime)

      // Note: Do not throw an error. This is a top-level function.
      return false
    }
  }
}

export default TimerControllers
