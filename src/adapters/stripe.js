/*
  Adapter for Stripe Checkout.
*/

import Stripe from 'stripe'

class StripeAdapter {
  constructor (localConfig = {}) {
    this.config = localConfig

    if (!this.config.stripeSecretKey) {
      this.stripe = null
    } else {
      this.stripe = new Stripe(this.config.stripeSecretKey)
    }

    this.createCheckoutSession = this.createCheckoutSession.bind(this)
    this.createPaymentIntent = this.createPaymentIntent.bind(this)
    this.retrieveCheckoutSession = this.retrieveCheckoutSession.bind(this)
    this.retrievePaymentIntent = this.retrievePaymentIntent.bind(this)
    this.expireCheckoutSession = this.expireCheckoutSession.bind(this)
    this.cancelPaymentIntent = this.cancelPaymentIntent.bind(this)
  }

  _ensureClient () {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY.')
    }
  }

  async createCheckoutSession (inObj = {}) {
    try {
      this._ensureClient()

      const { paymentId, priceUSD, creditsQuantity } = inObj
      if (!paymentId) throw new Error('paymentId is required')
      if (!priceUSD) throw new Error('priceUSD is required')
      if (!creditsQuantity) throw new Error('creditsQuantity is required')

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${creditsQuantity} Credits`,
              description: 'Pearson credits purchase'
            },
            unit_amount: Math.round(priceUSD * 100)
          },
          quantity: 1
        }],
        mode: 'payment',
        success_url: `${this.config.stripeSuccessUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: this.config.stripeCancelUrl,
        metadata: {
          paymentId: paymentId.toString()
        }
      })

      return session
    } catch (error) {
      console.log('Error in stripe/createCheckoutSession()')
      throw error
    }
  }

  async createPaymentIntent (inObj = {}) {
    try {
      this._ensureClient()

      const { paymentId, priceUSD, creditsQuantity } = inObj
      if (!paymentId) throw new Error('paymentId is required')
      if (!priceUSD) throw new Error('priceUSD is required')
      if (!creditsQuantity) throw new Error('creditsQuantity is required')

      return await this.stripe.paymentIntents.create({
        amount: Math.round(priceUSD * 100),
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        metadata: {
          paymentId: paymentId.toString(),
          creditsQuantity: creditsQuantity.toString()
        }
      })
    } catch (error) {
      console.log('Error in stripe/createPaymentIntent()')
      throw error
    }
  }

  async retrievePaymentIntent (intentId) {
    try {
      this._ensureClient()

      if (!intentId) throw new Error('intentId is required')

      return await this.stripe.paymentIntents.retrieve(intentId)
    } catch (error) {
      console.log('Error in stripe/retrievePaymentIntent()')
      throw error
    }
  }

  async cancelPaymentIntent (intentId) {
    try {
      this._ensureClient()

      if (!intentId) return false

      await this.stripe.paymentIntents.cancel(intentId)
      return true
    } catch (error) {
      console.log('Error in stripe/cancelPaymentIntent()')
      throw error
    }
  }

  async retrieveCheckoutSession (sessionId) {
    try {
      this._ensureClient()

      if (!sessionId) throw new Error('sessionId is required')

      return await this.stripe.checkout.sessions.retrieve(sessionId)
    } catch (error) {
      console.log('Error in stripe/retrieveCheckoutSession()')
      throw error
    }
  }

  async expireCheckoutSession (sessionId) {
    try {
      this._ensureClient()

      if (!sessionId) return false

      await this.stripe.checkout.sessions.expire(sessionId)
      return true
    } catch (error) {
      console.log('Error in stripe/expireCheckoutSession()')
      throw error
    }
  }
}

export default StripeAdapter
