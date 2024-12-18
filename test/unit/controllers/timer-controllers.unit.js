/*
  Unit tests for the timer-controller.js Controller library
*/

// Public npm libraries
import { assert } from 'chai'
import sinon from 'sinon'

// Local libraries
import TimerControllers from '../../../src/controllers/timer-controllers.js'
import adapters from '../mocks/adapters/index.js'
import UseCasesMock from '../mocks/use-cases/index.js'

describe('#Timer-Controllers', () => {
  let uut
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()

    const useCases = new UseCasesMock()
    uut = new TimerControllers({ adapters, useCases })
  })

  afterEach(() => {
    sandbox.restore()

    uut.stopTimers()
  })

  describe('#constructor', () => {
    it('should throw an error if adapters are not passed in', () => {
      try {
        uut = new TimerControllers()

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(
          err.message,
          'Instance of Adapters library required when instantiating Timer Controller libraries.'
        )
      }
    })

    it('should throw an error if useCases are not passed in', () => {
      try {
        uut = new TimerControllers({ adapters })

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(
          err.message,
          'Instance of Use Cases library required when instantiating Timer Controller libraries.'
        )
      }
    })
  })

  describe('#startTimers', () => {
    it('should start the timers', () => {
      const result = uut.startTimers()

      uut.stopTimers()

      assert.equal(result, true)
    })
  })

  describe('#reviewPayments', () => {
    it('should kick off the payment review', async () => {
      sandbox.stub(uut.useCases.user, 'reviewPayments').resolves()
      const result = await uut.reviewPayments()

      assert.equal(result, true)
    })

    it('should return false on error', async () => {
      sandbox.stub(uut.useCases.user, 'reviewPayments').throws()
      const result = await uut.reviewPayments(true)

      assert.equal(result, false)
    })
  })
  describe('#renewTokenTigerJWT', () => {
    it('should kick off the jwt renew', async () => {
      sandbox.stub(uut.useCases.payment, 'renewTokenTigerJWT').resolves()
      const result = await uut.renewTokenTigerJWT()

      assert.equal(result, true)
    })

    it('should return false on error', async () => {
      sandbox.stub(uut.useCases.payment, 'renewTokenTigerJWT').throws()
      const result = await uut.renewTokenTigerJWT()

      assert.equal(result, false)
    })
  })
})
