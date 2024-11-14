/*
  Unit tests for the REST API handler for the /users endpoints.
*/

// Public npm libraries
import { assert } from 'chai'

import sinon from 'sinon'

// Local support libraries
import adapters from '../../../mocks/adapters/index.js'

import UseCasesMock from '../../../mocks/use-cases/index.js'

// const app = require('../../../mocks/app-mock')

import PaymentRouter from '../../../../../src/controllers/rest-api/payments/index.js'

let uut
let sandbox
// let ctx

// const mockContext = require('../../../../unit/mocks/ctx-mock').context

describe('#Payments-REST-Router', () => {
  // const testUser = {}

  beforeEach(() => {
    const useCases = new UseCasesMock()
    uut = new PaymentRouter({ adapters, useCases })

    sandbox = sinon.createSandbox()

    // Mock the context object.
    // ctx = mockContext()
  })

  afterEach(() => sandbox.restore())

  describe('#constructor', () => {
    it('should throw an error if adapters are not passed in', () => {
      try {
        uut = new PaymentRouter()

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(
          err.message,
          'Instance of Adapters library required when instantiating PostEntry REST Controller.'
        )
      }
    })

    it('should throw an error if useCases are not passed in', () => {
      try {
        uut = new PaymentRouter({ adapters })

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(
          err.message,
          'Instance of Use Cases library required when instantiating PostEntry REST Controller.'
        )
      }
    })
  })

  describe('#attach', () => {
    it('should throw an error if app is not passed in.', () => {
      try {
        uut.attach()

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(
          err.message,
          'Must pass app object when attaching REST API controllers.'
        )
      }
    })
  })
  describe('#createPayment', () => {
    it('should route traffic to the middleware and controller', async () => {
      // Mock dependencies and force desired code path
      sandbox.stub(uut.validators, 'ensureUser').resolves()
      sandbox.stub(uut.paymentRESTControllerLib, 'createPayment').resolves()

      const result = await uut.createPayment()

      assert.equal(result, true)
    })
  })
  describe('#getAll', () => {
    it('should route traffic to the middleware and controller', async () => {
      // Mock dependencies and force desired code path
      sandbox.stub(uut.validators, 'ensureUser').resolves()
      sandbox.stub(uut.paymentRESTControllerLib, 'getPayments').resolves()

      const result = await uut.getAll()

      assert.equal(result, true)
    })
  })
  describe('#getById', () => {
    it('should route traffic to the middleware and controller', async () => {
      // Mock dependencies and force desired code path
      sandbox.stub(uut.validators, 'ensureUser').resolves()
      sandbox.stub(uut.paymentRESTControllerLib, 'getPayment').resolves()

      const result = await uut.getById()

      assert.equal(result, true)
    })
  })
  describe('#cancelPayment', () => {
    it('should route traffic to the middleware and controller', async () => {
      // Mock dependencies and force desired code path
      sandbox.stub(uut.validators, 'ensureUser').resolves()
      sandbox.stub(uut.paymentRESTControllerLib, 'getPayment').resolves()
      sandbox.stub(uut.paymentRESTControllerLib, 'cancelPayment').resolves()

      const result = await uut.cancelPayment()

      assert.equal(result, true)
    })
  })
  describe('#deletePayment', () => {
    it('should route traffic to the middleware and controller', async () => {
      // Mock dependencies and force desired code path
      sandbox.stub(uut.validators, 'ensureUser').resolves()
      sandbox.stub(uut.paymentRESTControllerLib, 'getPayment').resolves()
      sandbox.stub(uut.paymentRESTControllerLib, 'deletePayment').resolves()

      const result = await uut.deletePayment()

      assert.equal(result, true)
    })
  })
})
