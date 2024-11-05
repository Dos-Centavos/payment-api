/*
  Unit tests for the REST API handler for the /payments endpoints.
*/

// Public npm libraries
import { assert } from 'chai'
import sinon from 'sinon'

// Local support libraries
import adapters from '../../../mocks/adapters/index.js'
import UseCasesMock from '../../../mocks/use-cases/index.js'
import PaymentController from '../../../../../src/controllers/rest-api/payments/controller.js'

import { context as mockContext } from '../../../../unit/mocks/ctx-mock.js'
let uut
let sandbox
let ctx

describe('#Payments-REST-Controller', () => {
  // const testUser = {}

  beforeEach(() => {
    const useCases = new UseCasesMock()
    uut = new PaymentController({ adapters, useCases })

    sandbox = sinon.createSandbox()

    // Mock the context object.
    ctx = mockContext()
  })

  afterEach(() => sandbox.restore())

  describe('#constructor', () => {
    it('should throw an error if adapters are not passed in', () => {
      try {
        uut = new PaymentController()

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(
          err.message,
          'Instance of Adapters library required when instantiating /payments REST Controller.'
        )
      }
    })

    it('should throw an error if useCases are not passed in', () => {
      try {
        uut = new PaymentController({ adapters })

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(
          err.message,
          'Instance of Use Cases library required when instantiating /payments REST Controller.'
        )
      }
    })
  })

  describe('#POST /payments', () => {
    it('should return 422 status on biz logic error', async () => {
      try {
        await uut.createPayment(ctx)

        assert.fail('Unexpected result')
      } catch (err) {
        // console.log(err)
        assert.equal(err.status, 422)
        assert.include(err.message, 'Cannot read')
      }
    })

    it('should return 200 status on success', async () => {
      ctx.request.body = {
        payment: {
          userId: 'userId',
          type: 1
        }
      }

      await uut.createPayment(ctx)

      // Assert the expected HTTP response
      assert.equal(ctx.status, 200)

      // Assert that expected properties exist in the returned data.
      assert.property(ctx.response.body, 'payment')
    })
  })

  describe('GET /payments', () => {
    it('should return 422 status on arbitrary biz logic error', async () => {
      try {
        // Force an error
        sandbox
          .stub(uut.useCases.payment, 'getAllPayments')
          .rejects(new Error('test error'))

        await uut.getPayments(ctx)

        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.status, 422)
        assert.include(err.message, 'test error')
      }
    })

    it('should return 200 status on success', async () => {
      await uut.getPayments(ctx)

      // Assert the expected HTTP response
      assert.equal(ctx.status, 200)

      // Assert that expected properties exist in the returned data.
      assert.property(ctx.response.body, 'payments')
    })
  })

  describe('GET /payments/:id', () => {
    it('should return 422 status on arbitrary biz logic error', async () => {
      try {
        // Force an error
        sandbox
          .stub(uut.useCases.payment, 'getPayment')
          .rejects(new Error('test error'))

        await uut.getPayment(ctx)

        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.status, 422)
        assert.include(err.message, 'test error')
      }
    })

    it('should return 200 status on success', async () => {
      // Mock dependencies
      sandbox.stub(uut.useCases.payment, 'getPayment').resolves({ _id: '123' })

      await uut.getPayment(ctx)

      // Assert the expected HTTP response
      assert.equal(ctx.status, 200)

      // Assert that expected properties exist in the returned data.
      assert.property(ctx.response.body, 'payment')
    })
    it('should call next function on success', async () => {
      // Mock dependencies
      sandbox.stub(uut.useCases.payment, 'getPayment').resolves({ _id: '123' })
      const next = sinon.spy()

      await uut.getPayment(ctx, next)

      // Assert the expected HTTP response
      assert.equal(ctx.status, 200)

      // Assert that expected properties exist in the returned data.
      assert.property(ctx.response.body, 'payment')
      assert.isTrue(next.calledOnce)
    })

    it('should return other error status passed by biz logic', async () => {
      try {
        // Mock dependencies
        const testErr = new Error('test error')
        testErr.status = 404
        sandbox.stub(uut.useCases.payment, 'getPayment').rejects(testErr)

        await uut.getPayment(ctx)

        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.status, 404)
        assert.include(err.message, 'test error')
      }
    })
  })

  describe('PUT /payments/cancel/:id', () => {
    it('should return 422 if no input data given', async () => {
      try {
        await uut.cancelPayment(ctx)

        assert.fail('Unexpected result')
      } catch (err) {
        // console.log(err)
        assert.equal(err.status, 422)
        assert.include(err.message, 'Cannot read')
      }
    })

    it('should return 200 on success', async () => {
      const existingPayment = {}

      ctx.body = {
        payment: existingPayment
      }

      // Mock dependencies
      sandbox.stub(uut.useCases.payment, 'cancelPayment').resolves({})

      await uut.cancelPayment(ctx)

      // Assert the expected HTTP response
      assert.equal(ctx.status, 200)

      // Assert that expected properties exist in the returned data.
      assert.property(ctx.response.body, 'payment')
    })
  })

  describe('DELETE /payment/:id', () => {
    it('should return 422 if no input data given', async () => {
      try {
        await uut.deletePayment(ctx)

        assert.fail('Unexpected result')
      } catch (err) {
        // console.log(err)
        assert.equal(err.status, 422)
        assert.include(err.message, 'Cannot read')
      }
    })

    it('should return 200 status on success', async () => {
      const existingPayment = {}

      ctx.body = {
        payment: existingPayment
      }

      await uut.deletePayment(ctx)

      // Assert the expected HTTP response
      assert.equal(ctx.status, 200)
    })
  })

  describe('#handleError', () => {
    it('should still throw error if there is no message', () => {
      try {
        const err = {
          status: 404
        }

        uut.handleError(ctx, err)
      } catch (err) {
        assert.include(err.message, 'Not Found')
      }
    })
  })
})
