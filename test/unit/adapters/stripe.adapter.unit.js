/*
  Unit tests for the Stripe adapter.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import StripeAdapter from '../../../src/adapters/stripe.js'

describe('#stripe-adapter', () => {
  let uut
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    uut = new StripeAdapter({
      stripeSecretKey: 'sk_test_123',
      stripeSuccessUrl: 'http://localhost:5020/success',
      stripeCancelUrl: 'http://localhost:5020/cancel'
    })
  })

  afterEach(() => sandbox.restore())

  describe('#createCheckoutSession', () => {
    it('should throw if Stripe is not configured', async () => {
      uut = new StripeAdapter({})

      try {
        await uut.createCheckoutSession({
          paymentId: 'abc',
          priceUSD: 2.99,
          creditsQuantity: 3
        })
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'Stripe is not configured')
      }
    })

    it('should throw if paymentId is missing', async () => {
      try {
        await uut.createCheckoutSession({ priceUSD: 2.99, creditsQuantity: 3 })
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'paymentId is required')
      }
    })

    it('should throw if priceUSD is missing', async () => {
      try {
        await uut.createCheckoutSession({ paymentId: 'abc', creditsQuantity: 3 })
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'priceUSD is required')
      }
    })

    it('should throw if creditsQuantity is missing', async () => {
      try {
        await uut.createCheckoutSession({ paymentId: 'abc', priceUSD: 2.99 })
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'creditsQuantity is required')
      }
    })

    it('should create a checkout session with correct payload', async () => {
      const createStub = sandbox.stub(uut.stripe.checkout.sessions, 'create').resolves({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test'
      })

      const session = await uut.createCheckoutSession({
        paymentId: 'abc',
        priceUSD: 2.99,
        creditsQuantity: 3
      })

      assert.equal(session.id, 'cs_test_123')
      assert.equal(session.url, 'https://checkout.stripe.com/test')
      assert.isTrue(createStub.calledOnce)

      const payload = createStub.firstCall.args[0]
      assert.equal(payload.mode, 'payment')
      assert.equal(payload.line_items[0].price_data.unit_amount, 299)
      assert.equal(payload.metadata.paymentId, 'abc')
      assert.include(payload.success_url, 'http://localhost:5020/success')
      assert.equal(payload.cancel_url, 'http://localhost:5020/cancel')
    })

    it('should propagate Stripe API errors', async () => {
      sandbox
        .stub(uut.stripe.checkout.sessions, 'create')
        .rejects(new Error('Stripe API error'))

      try {
        await uut.createCheckoutSession({
          paymentId: 'abc',
          priceUSD: 2.99,
          creditsQuantity: 3
        })
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'Stripe API error')
      }
    })
  })

  describe('#createPaymentIntent', () => {
    it('should throw if Stripe is not configured', async () => {
      uut = new StripeAdapter({})

      try {
        await uut.createPaymentIntent({
          paymentId: 'abc',
          priceUSD: 4.99,
          creditsQuantity: 10
        })
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'Stripe is not configured')
      }
    })

    it('should throw if required fields are missing', async () => {
      try {
        await uut.createPaymentIntent({ priceUSD: 4.99, creditsQuantity: 10 })
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'paymentId is required')
      }
    })

    it('should create a payment intent with correct payload', async () => {
      const createStub = sandbox.stub(uut.stripe.paymentIntents, 'create').resolves({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret'
      })

      const intent = await uut.createPaymentIntent({
        paymentId: 'abc',
        priceUSD: 4.99,
        creditsQuantity: 10
      })

      assert.equal(intent.id, 'pi_test_123')
      assert.equal(intent.client_secret, 'pi_test_123_secret')

      const payload = createStub.firstCall.args[0]
      assert.equal(payload.amount, 499)
      assert.equal(payload.currency, 'usd')
      assert.equal(payload.metadata.paymentId, 'abc')
      assert.equal(payload.metadata.creditsQuantity, '10')
    })

    it('should propagate Stripe API errors', async () => {
      sandbox
        .stub(uut.stripe.paymentIntents, 'create')
        .rejects(new Error('Stripe API error'))

      try {
        await uut.createPaymentIntent({
          paymentId: 'abc',
          priceUSD: 4.99,
          creditsQuantity: 10
        })
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'Stripe API error')
      }
    })
  })

  describe('#retrieveCheckoutSession', () => {
    it('should throw if Stripe is not configured', async () => {
      uut = new StripeAdapter({})

      try {
        await uut.retrieveCheckoutSession('cs_test_123')
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'Stripe is not configured')
      }
    })

    it('should throw if sessionId is missing', async () => {
      try {
        await uut.retrieveCheckoutSession()
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'sessionId is required')
      }
    })

    it('should retrieve a checkout session', async () => {
      sandbox.stub(uut.stripe.checkout.sessions, 'retrieve').resolves({
        id: 'cs_test_123',
        payment_status: 'paid'
      })

      const session = await uut.retrieveCheckoutSession('cs_test_123')

      assert.equal(session.id, 'cs_test_123')
      assert.equal(session.payment_status, 'paid')
    })

    it('should propagate Stripe API errors', async () => {
      sandbox
        .stub(uut.stripe.checkout.sessions, 'retrieve')
        .rejects(new Error('Stripe API error'))

      try {
        await uut.retrieveCheckoutSession('cs_test_123')
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'Stripe API error')
      }
    })
  })

  describe('#retrievePaymentIntent', () => {
    it('should throw if Stripe is not configured', async () => {
      uut = new StripeAdapter({})

      try {
        await uut.retrievePaymentIntent('pi_test_123')
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'Stripe is not configured')
      }
    })

    it('should throw if intentId is missing', async () => {
      try {
        await uut.retrievePaymentIntent()
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'intentId is required')
      }
    })

    it('should retrieve a payment intent', async () => {
      sandbox.stub(uut.stripe.paymentIntents, 'retrieve').resolves({
        id: 'pi_test_123',
        status: 'succeeded'
      })

      const intent = await uut.retrievePaymentIntent('pi_test_123')

      assert.equal(intent.id, 'pi_test_123')
      assert.equal(intent.status, 'succeeded')
    })

    it('should propagate Stripe API errors', async () => {
      sandbox
        .stub(uut.stripe.paymentIntents, 'retrieve')
        .rejects(new Error('Stripe API error'))

      try {
        await uut.retrievePaymentIntent('pi_test_123')
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'Stripe API error')
      }
    })
  })

  describe('#expireCheckoutSession', () => {
    it('should throw if Stripe is not configured', async () => {
      uut = new StripeAdapter({})

      try {
        await uut.expireCheckoutSession('cs_test_123')
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'Stripe is not configured')
      }
    })

    it('should expire a checkout session', async () => {
      sandbox.stub(uut.stripe.checkout.sessions, 'expire').resolves({})

      const result = await uut.expireCheckoutSession('cs_test_123')

      assert.equal(result, true)
    })

    it('should return false when sessionId is missing', async () => {
      const result = await uut.expireCheckoutSession()

      assert.equal(result, false)
    })

    it('should propagate Stripe API errors', async () => {
      sandbox
        .stub(uut.stripe.checkout.sessions, 'expire')
        .rejects(new Error('Stripe API error'))

      try {
        await uut.expireCheckoutSession('cs_test_123')
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'Stripe API error')
      }
    })
  })

  describe('#cancelPaymentIntent', () => {
    it('should throw if Stripe is not configured', async () => {
      uut = new StripeAdapter({})

      try {
        await uut.cancelPaymentIntent('pi_test_123')
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'Stripe is not configured')
      }
    })

    it('should cancel a payment intent', async () => {
      sandbox.stub(uut.stripe.paymentIntents, 'cancel').resolves({})

      const result = await uut.cancelPaymentIntent('pi_test_123')

      assert.equal(result, true)
    })

    it('should return false when intentId is missing', async () => {
      const result = await uut.cancelPaymentIntent()

      assert.equal(result, false)
    })

    it('should propagate Stripe API errors', async () => {
      sandbox
        .stub(uut.stripe.paymentIntents, 'cancel')
        .rejects(new Error('Stripe API error'))

      try {
        await uut.cancelPaymentIntent('pi_test_123')
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'Stripe API error')
      }
    })
  })
})
