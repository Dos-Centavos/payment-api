/*
  Unit tests for the src/use-cases/payments.js business logic library.

*/

// Public npm libraries
import { assert } from 'chai'
import sinon from 'sinon'

// Local support libraries
// const testUtils = require('../../utils/test-utils')

// Unit under test (uut)
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
  let testPayment = {}

  before(async () => {

  })

  beforeEach(() => {
    sandbox = sinon.createSandbox()

    uut = new PaymentLib({ adapters })
    uut.BchWallet = MockBchWallet
    uut.config = {
      paymentTypes
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
        // console.log(err)
        // assert.equal(err.status, 422)
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
        const inObj = {
          userId: 'mongodb id'
        }

        await uut.createPayment(inObj)

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, "Property 'type' must be a number!")
      }
    })

    it('should catch and throw DB errors', async () => {
      try {
        // Force an error with the database.
        sandbox.stub(uut, 'PaymentModel').throws(new Error('test error'))

        const inObj = {
          userId: 'mongodb id',
          type: 1
        }

        await uut.createPayment(inObj)

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'test error')
      }
    })

    it('should throw error for existing "in-process" payment', async () => {
      try {
        sandbox.stub(uut.PaymentModel, 'findOne').resolves({ status: 'in-process' })

        const inObj = {
          userId: 'mongodb id',
          type: 1
        }

        await uut.createPayment(inObj)

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'One payment is currently in process')
      }
    })
    it('should throw error if provided payment type is wrong.', async () => {
      try {
        const inObj = {
          userId: 'mongodb id',
          type: 10
        }

        await uut.createPayment(inObj)

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'Provided payment type not found!')
      }
    })

    it('should create a new payment in the DB', async () => {
      const inObj = {
        userId: 'mongodb id',
        type: 1
      }

      const payment = await uut.createPayment(inObj)

      testPayment = payment
      assert.isObject(testPayment)
      assert.property(testPayment, '_id')
      assert.property(testPayment, 'createdAt')
      assert.property(testPayment, 'priceUSD')
      assert.property(testPayment, 'priceSats')
      assert.property(testPayment, 'status')
      assert.property(testPayment, 'creditsQuantity')
      assert.equal(testPayment.status, 'in-process')
    })
  })

  describe('#getAllPayments', () => {
    it('should return all payments from the database', async () => {
      sandbox.stub(uut.PaymentModel, 'find').resolves([])

      const result = await uut.getAllPayments()

      assert.isArray(result)
    })

    it('should catch and throw an error', async () => {
      try {
        // Force an error.
        sandbox.stub(uut.PaymentModel, 'find').rejects(new Error('test error'))

        await uut.getAllPayments()

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, 'test error')
      }
    })
  })

  describe('#getPayment', () => {
    it('should throw 422 if no id given.', async () => {
      try {
        await uut.getPayment()

        assert.fail('Unexpected code path.')
      } catch (err) {
        // console.log(err)
        assert.equal(err.status, 422)
        assert.include(err.message, 'Unprocessable Entity')
      }
    })

    it('should throw 422 for malformed id', async () => {
      try {
        // Force an error.
        sandbox
          .stub(uut.PaymentModel, 'findById')
          .rejects(new Error('Unprocessable Entity'))

        const params = { id: 1 }
        await uut.getPayment(params)

        assert.fail('Unexpected code path.')
      } catch (err) {
        // console.log(err)
        assert.equal(err.status, 422)
        assert.include(err.message, 'Unprocessable Entity')
      }
    })

    it('should throw 404 if payment is not found', async () => {
      try {
        const params = { id: '5fa4bd7ee1828f5f4d3ed004' }
        await uut.getPayment(params)

        assert.fail('Unexpected code path.')
      } catch (err) {
        // console.log(err)
        assert.equal(err.status, 404)
        assert.include(err.message, 'Payment not found')
      }
    })

    it('should return the payment model', async () => {
      sandbox.stub(uut.PaymentModel, 'findById').resolves({ _id: 'abc123' })

      const params = { id: testPayment._id }
      const result = await uut.getPayment(params)

      assert.property(result, '_id')
    })
  })

  describe('#cancelPayment', () => {
    it('should throw an error if no input is given', async () => {
      try {
        await uut.cancelPayment()

        assert.fail('Unexpected code path')
      } catch (err) {
        // console.log(err)
        assert.include(err.message, 'Cannot set')
      }
    })

    it('should update the status payment model', async () => {
      const result = await uut.cancelPayment(testPayment)

      // Assert that expected properties and values exist.
      assert.property(result, '_id')
      assert.equal(result.status, 'cancelled')
      assert.isNumber(result.completedAt)
    })
  })

  describe('#deletePayment', () => {
    it('should throw error if no payment provided', async () => {
      try {
        await uut.deletePayment()

        assert.fail('Unexpected code path.')
      } catch (err) {
        // console.log(err)
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
      try {
        sandbox.stub(uut.adapters.tokenTiger, 'auth').throws(new Error('test error'))
        await uut.renewTokenTigerJWT()

        assert.fail('Unexpected code path.')
      } catch (err) {
        // console.log(err)
        assert.include(err.message, 'test error')
      }
    })

    it('should renew token-tiger jwt', async () => {
      sandbox.stub(uut.adapters.tokenTiger, 'auth').resolves('new jwt')
      const result = await uut.renewTokenTigerJWT()

      assert.isString(result)
      assert.equal(result, 'new jwt')
    })
  })
})
