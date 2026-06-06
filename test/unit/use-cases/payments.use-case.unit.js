/*
  Unit tests for the src/use-cases/payment.js business logic library.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import PaymentLib from '../../../src/use-cases/payment.js'
import adapters from '../mocks/adapters/index.js'
import { MockBchWallet } from '../mocks/adapters/wallet.js'

const paymentTypes = {
  1: { priceUSD: 3, creditsQuantity: 3 },
  2: { priceUSD: 8, creditsQuantity: 10 }
}

describe('#payments-use-case', () => {
  let uut
  let sandbox
  let testPayment

  beforeEach(() => {
    sandbox = sinon.createSandbox()

    uut = new PaymentLib({ adapters })
    uut.BchWallet = MockBchWallet
    uut.config = { paymentTypes }

    testPayment = {
      _id: 'payment123',
      userId: 'user123',
      type: 1,
      paymentMethod: 'Blockchain',
      status: 'in-process',
      save: sandbox.stub().resolves(),
      remove: sandbox.stub().resolves()
    }
  })

  afterEach(() => sandbox.restore())

  describe('#constructor', () => {
    it('should throw an error if adapters are not passed in', () => {
      try {
        uut = new PaymentLib()
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(
          err.message,
          'Instance of adapters must be passed in when instantiating Payment Use Cases library.'
        )
      }
    })
  })

  describe('#createPayment', () => {
    it('should throw an error if no input is given', async () => {
      try {
        await uut.createPayment()
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, "Property 'userId' must be a string!")
      }
    })

    it('should throw an error if userId is not provided', async () => {
      try {
        await uut.createPayment({})
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, "Property 'userId' must be a string!")
      }
    })

    it('should throw an error if type is not provided', async () => {
      try {
        await uut.createPayment({ userId: 'mongodb id' })
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, "Property 'type' must be a number!")
      }
    })

    it('should catch and throw DB errors', async () => {
      sandbox.stub(uut, 'PaymentModel').throws(new Error('test error'))

      try {
        await uut.createPayment({ userId: 'mongodb id', type: 1 })
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'test error')
      }
    })

    it('should throw error for existing "in-process" payment', async () => {
      sandbox.stub(uut.PaymentModel, 'findOne').resolves({ status: 'in-process' })

      try {
        await uut.createPayment({ userId: 'mongodb id', type: 1 })
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'One payment is currently in process')
      }
    })

    it('should throw error if provided payment type is wrong', async () => {
      try {
        await uut.createPayment({ userId: 'mongodb id', type: 10 })
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'Provided payment type not found!')
      }
    })

    it('should throw error for invalid paymentMethod', async () => {
      try {
        await uut.createPayment({
          userId: 'mongodb id',
          type: 1,
          paymentMethod: 'PayPal'
        })
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(
          err.message,
          "Property 'paymentMethod' must be 'Blockchain' or 'Stripe'"
        )
      }
    })

    it('should create a Blockchain payment in the DB', async () => {
      const payment = await uut.createPayment({
        userId: 'mongodb id',
        type: 1
      })

      assert.isObject(payment)
      assert.property(payment, '_id')
      assert.property(payment, 'createdAt')
      assert.property(payment, 'priceUSD')
      assert.property(payment, 'priceSats')
      assert.property(payment, 'status')
      assert.property(payment, 'creditsQuantity')
      assert.equal(payment.paymentMethod, 'Blockchain')
      assert.equal(payment.status, 'in-process')
    })

    it('should create a Stripe Checkout payment with checkoutUrl', async () => {
      sandbox.stub(uut.PaymentModel, 'findOne').resolves(null)
      sandbox.stub(uut.adapters.stripe, 'createCheckoutSession').resolves({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test'
      })

      const payment = await uut.createPayment({
        userId: 'mongodb id',
        type: 1,
        paymentMethod: 'Stripe'
      })

      assert.equal(payment.paymentMethod, 'Stripe')
      assert.equal(payment.priceSats, 0)
      assert.equal(payment.stripeSessionId, 'cs_test_123')
      assert.equal(payment.checkoutUrl, 'https://checkout.stripe.com/test')
      assert.isUndefined(payment.clientSecret)
    })

    it('should create a Stripe embedded payment with clientSecret', async () => {
      sandbox.stub(uut.PaymentModel, 'findOne').resolves(null)
      sandbox.stub(uut.adapters.stripe, 'createPaymentIntent').resolves({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret'
      })

      const payment = await uut.createPayment({
        userId: 'mongodb id',
        type: 1,
        paymentMethod: 'Stripe',
        stripeUiMode: 'embedded'
      })

      assert.equal(payment.paymentMethod, 'Stripe')
      assert.equal(payment.stripePaymentIntentId, 'pi_test_123')
      assert.equal(payment.clientSecret, 'pi_test_123_secret')
      assert.isUndefined(payment.checkoutUrl)
    })

    it('should propagate Stripe Checkout session creation errors', async () => {
      sandbox.stub(uut.PaymentModel, 'findOne').resolves(null)
      sandbox
        .stub(uut.adapters.stripe, 'createCheckoutSession')
        .rejects(new Error('Stripe unavailable'))

      try {
        await uut.createPayment({
          userId: 'mongodb id',
          type: 1,
          paymentMethod: 'Stripe'
        })
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'Stripe unavailable')
      }
    })
  })

  describe('#getAllPayments', () => {
    it('should return all payments from the database', async () => {
      sandbox.stub(uut.PaymentModel, 'find').resolves([])

      const result = await uut.getAllPayments()

      assert.isArray(result)
    })

    it('should catch and throw an error', async () => {
      sandbox.stub(uut.PaymentModel, 'find').rejects(new Error('test error'))

      try {
        await uut.getAllPayments()
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'test error')
      }
    })
  })

  describe('#getPayment', () => {
    it('should throw 422 if no id given', async () => {
      try {
        await uut.getPayment()
        assert.fail('Unexpected code path.')
      } catch (err) {
        assert.equal(err.status, 422)
        assert.include(err.message, 'Unprocessable Entity')
      }
    })

    it('should throw 422 for malformed id', async () => {
      sandbox
        .stub(uut.PaymentModel, 'findById')
        .rejects(new Error('Unprocessable Entity'))

      try {
        await uut.getPayment({ id: 1 })
        assert.fail('Unexpected code path.')
      } catch (err) {
        assert.equal(err.status, 422)
        assert.include(err.message, 'Unprocessable Entity')
      }
    })

    it('should throw 404 if payment is not found', async () => {
      try {
        await uut.getPayment({ id: '5fa4bd7ee1828f5f4d3ed004' })
        assert.fail('Unexpected code path.')
      } catch (err) {
        assert.equal(err.status, 404)
        assert.include(err.message, 'Payment not found')
      }
    })

    it('should return the payment model', async () => {
      sandbox.stub(uut.PaymentModel, 'findById').resolves({ _id: 'abc123' })

      const result = await uut.getPayment({ id: 'abc123' })

      assert.property(result, '_id')
    })
  })

  describe('#cancelPayment', () => {
    it('should throw an error if no input is given', async () => {
      try {
        await uut.cancelPayment()
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'Cannot set')
      }
    })

    it('should update the status of a Blockchain payment', async () => {
      const result = await uut.cancelPayment(testPayment)

      assert.property(result, '_id')
      assert.equal(result.status, 'cancelled')
      assert.isNumber(result.completedAt)
    })

    it('should expire Stripe Checkout session when cancelling', async () => {
      const stripePayment = {
        ...testPayment,
        paymentMethod: 'Stripe',
        stripeSessionId: 'cs_test_123',
        save: sandbox.stub().resolves()
      }
      sandbox
        .stub(uut.adapters.stripe, 'expireCheckoutSession')
        .resolves(true)

      await uut.cancelPayment(stripePayment)

      assert.isTrue(uut.adapters.stripe.expireCheckoutSession.calledOnceWith(
        'cs_test_123'
      ))
    })

    it('should cancel Stripe PaymentIntent when cancelling embedded payment', async () => {
      const stripePayment = {
        ...testPayment,
        paymentMethod: 'Stripe',
        stripePaymentIntentId: 'pi_test_123',
        save: sandbox.stub().resolves()
      }
      sandbox
        .stub(uut.adapters.stripe, 'cancelPaymentIntent')
        .resolves(true)

      await uut.cancelPayment(stripePayment)

      assert.isTrue(uut.adapters.stripe.cancelPaymentIntent.calledOnceWith(
        'pi_test_123'
      ))
    })
  })

  describe('#deletePayment', () => {
    it('should throw error if no payment provided', async () => {
      try {
        await uut.deletePayment()
        assert.fail('Unexpected code path.')
      } catch (err) {
        assert.include(err.message, 'Cannot read')
      }
    })

    it('should delete the payment from the database', async () => {
      await uut.deletePayment(testPayment)
      assert.isOk('Not throwing an error is a pass!')
    })
  })

  describe('#renewTokenTigerJWT', () => {
    it('should handle error', async () => {
      sandbox.stub(uut.adapters.tokenTiger, 'auth').throws(new Error('test error'))

      try {
        await uut.renewTokenTigerJWT()
        assert.fail('Unexpected code path.')
      } catch (err) {
        assert.include(err.message, 'test error')
      }
    })

    it('should renew token-tiger jwt', async () => {
      sandbox.stub(uut.adapters.tokenTiger, 'auth').resolves('new jwt')

      const result = await uut.renewTokenTigerJWT()

      assert.equal(result, 'new jwt')
    })
  })

  describe('#verifyStripePayment', () => {
    it('should throw if payment is not Stripe', async () => {
      try {
        await uut.verifyStripePayment(testPayment)
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'Payment is not a Stripe payment')
      }
    })

    it('should return already completed payments without re-verifying', async () => {
      const payment = {
        paymentMethod: 'Stripe',
        status: 'completed'
      }

      const result = await uut.verifyStripePayment(payment)

      assert.equal(result.status, 'completed')
    })

    it('should complete payment when Stripe Checkout session is paid', async () => {
      const payment = {
        _id: 'payment123',
        userId: 'user123',
        paymentMethod: 'Stripe',
        status: 'in-process',
        creditsQuantity: 3,
        stripeSessionId: 'cs_test_123',
        save: sandbox.stub().resolves()
      }

      sandbox.stub(uut.adapters.stripe, 'retrieveCheckoutSession').resolves({
        id: 'cs_test_123',
        payment_status: 'paid',
        metadata: { paymentId: 'payment123' }
      })
      sandbox.stub(uut.PaymentModel, 'findById').resolves(payment)
      sandbox.stub(uut.UserModel, 'findById').resolves({ pearsonId: 'pearson123' })
      sandbox.stub(uut.adapters.tokenTiger, 'addCredits').resolves({ success: true })

      const result = await uut.verifyStripePayment(payment)

      assert.equal(result.status, 'completed')
      assert.isTrue(uut.adapters.tokenTiger.addCredits.calledOnce)
    })

    it('should complete payment when Stripe PaymentIntent succeeded', async () => {
      const payment = {
        _id: 'payment123',
        userId: 'user123',
        paymentMethod: 'Stripe',
        status: 'in-process',
        creditsQuantity: 3,
        stripePaymentIntentId: 'pi_test_123',
        save: sandbox.stub().resolves()
      }

      sandbox.stub(uut.adapters.stripe, 'retrievePaymentIntent').resolves({
        id: 'pi_test_123',
        status: 'succeeded',
        object: 'payment_intent',
        metadata: { paymentId: 'payment123' }
      })
      sandbox.stub(uut.PaymentModel, 'findById').resolves(payment)
      sandbox.stub(uut.UserModel, 'findById').resolves({ pearsonId: 'pearson123' })
      sandbox.stub(uut.adapters.tokenTiger, 'addCredits').resolves({ success: true })

      const result = await uut.verifyStripePayment(payment)

      assert.equal(result.status, 'completed')
      assert.equal(result.stripePaymentIntentId, 'pi_test_123')
    })

    it('should throw if Stripe Checkout session is unpaid', async () => {
      const payment = {
        paymentMethod: 'Stripe',
        status: 'in-process',
        stripeSessionId: 'cs_test_123'
      }

      sandbox.stub(uut.adapters.stripe, 'retrieveCheckoutSession').resolves({
        id: 'cs_test_123',
        payment_status: 'unpaid'
      })

      try {
        await uut.verifyStripePayment(payment)
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.equal(err.status, 422)
        assert.include(err.message, 'Stripe payment has not been completed')
      }
    })

    it('should throw if Stripe PaymentIntent is not succeeded', async () => {
      const payment = {
        paymentMethod: 'Stripe',
        status: 'in-process',
        stripePaymentIntentId: 'pi_test_123'
      }

      sandbox.stub(uut.adapters.stripe, 'retrievePaymentIntent').resolves({
        id: 'pi_test_123',
        status: 'requires_payment_method'
      })

      try {
        await uut.verifyStripePayment(payment)
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.equal(err.status, 422)
        assert.include(err.message, 'Stripe payment has not been completed')
      }
    })

    it('should throw if Stripe Checkout session ID is missing', async () => {
      const payment = {
        paymentMethod: 'Stripe',
        status: 'in-process'
      }

      try {
        await uut.verifyStripePayment(payment)
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'Payment is missing Stripe session ID')
      }
    })
  })

  describe('#completeStripePayment', () => {
    it('should skip already completed payments', async () => {
      const payment = { status: 'completed' }

      sandbox.stub(uut.PaymentModel, 'findById').resolves(payment)
      sandbox.stub(uut.adapters.tokenTiger, 'addCredits')

      const result = await uut.completeStripePayment({
        id: 'cs_test_123',
        metadata: { paymentId: 'payment123' }
      })

      assert.equal(result.status, 'completed')
      assert.isFalse(uut.adapters.tokenTiger.addCredits.called)
    })

    it('should throw if Stripe resource is missing paymentId metadata', async () => {
      try {
        await uut.completeStripePayment({ id: 'cs_test_123', metadata: {} })
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'Stripe resource is missing paymentId metadata')
      }
    })

    it('should throw if payment is not found', async () => {
      sandbox.stub(uut.PaymentModel, 'findById').resolves(null)

      try {
        await uut.completeStripePayment({
          id: 'cs_test_123',
          metadata: { paymentId: 'missing-payment' }
        })
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'Payment missing-payment not found')
      }
    })

    it('should throw if payment is not a Stripe payment', async () => {
      sandbox.stub(uut.PaymentModel, 'findById').resolves({
        _id: 'payment123',
        paymentMethod: 'Blockchain',
        status: 'in-process'
      })

      try {
        await uut.completeStripePayment({
          id: 'cs_test_123',
          metadata: { paymentId: 'payment123' }
        })
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'Payment is not a Stripe payment')
      }
    })

    it('should throw if user is not found', async () => {
      sandbox.stub(uut.PaymentModel, 'findById').resolves({
        _id: 'payment123',
        userId: 'user123',
        paymentMethod: 'Stripe',
        status: 'in-process'
      })
      sandbox.stub(uut.UserModel, 'findById').resolves(null)

      try {
        await uut.completeStripePayment({
          id: 'cs_test_123',
          metadata: { paymentId: 'payment123' }
        })
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'User user123 not found')
      }
    })

    it('should complete Checkout session payment and store stripeSessionId', async () => {
      const payment = {
        _id: 'payment123',
        userId: 'user123',
        paymentMethod: 'Stripe',
        status: 'in-process',
        creditsQuantity: 3,
        save: sandbox.stub().resolves()
      }

      sandbox.stub(uut.PaymentModel, 'findById').resolves(payment)
      sandbox.stub(uut.UserModel, 'findById').resolves({ pearsonId: 'pearson123' })
      sandbox.stub(uut.adapters.tokenTiger, 'addCredits').resolves({ success: true })

      const result = await uut.completeStripePayment({
        id: 'cs_test_456',
        metadata: { paymentId: 'payment123' }
      })

      assert.equal(result.status, 'completed')
      assert.equal(result.stripeSessionId, 'cs_test_456')
      assert.isNumber(result.completedAt)
      assert.isTrue(uut.adapters.tokenTiger.addCredits.calledOnceWith({
        qty: 3,
        userId: 'pearson123'
      }))
    })
  })
})
