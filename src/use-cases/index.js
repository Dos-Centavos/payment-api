/*
  This is a top-level library that encapsulates all the additional Use Cases.
  The concept of Use Cases comes from Clean Architecture:
  https://troutsblog.com/blog/clean-architecture
*/

import UserUseCases from './user.js'
import PaymentUseCases from './payment.js'
class UseCases {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of adapters must be passed in when instantiating Use Cases library.'
      )
    }

    // console.log('use-cases/index.js localConfig: ', localConfig)
    this.user = new UserUseCases(localConfig)
    this.payment = new PaymentUseCases(localConfig)
  }

  // Run any startup Use Cases at the start of the app.
  async start () {
    console.log('Async Use Cases have been started.')

    return true
  }
}

export default UseCases
