/*
  Unit tests for the Payment entity library.
*/

import { assert } from 'chai'

import Payment from '../../../src/entities/payment.js'

describe('#Payment-Entity', () => {
  let uut

  beforeEach(() => {
    uut = new Payment()
  })

  describe('#validate', () => {
    it('should throw an error if userId is not provided', () => {
      try {
        uut.validate()
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, "Property 'userId' must be a string!")
      }
    })

    it('should throw an error if type is not provided', () => {
      try {
        uut.validate({ userId: 'abc123' })
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, "Property 'type' must be a number!")
      }
    })

    it('should throw an error if paymentMethod is invalid', () => {
      try {
        uut.validate({ userId: 'abc123', type: 1, paymentMethod: 'PayPal' })
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(
          err.message,
          "Property 'paymentMethod' must be 'Blockchain' or 'Stripe'"
        )
      }
    })

    it('should throw an error if paymentMethod is not a string', () => {
      try {
        uut.validate({ userId: 'abc123', type: 1, paymentMethod: 123 })
        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(err.message, "Property 'paymentMethod' must be a string!")
      }
    })

    it('should default paymentMethod to Blockchain', () => {
      const entry = uut.validate({ userId: 'abc123', type: 1 })

      assert.equal(entry.userId, 'abc123')
      assert.equal(entry.type, 1)
      assert.equal(entry.paymentMethod, 'Blockchain')
    })

    it('should accept Stripe as paymentMethod', () => {
      const entry = uut.validate({
        userId: 'abc123',
        type: 2,
        paymentMethod: 'Stripe'
      })

      assert.equal(entry.paymentMethod, 'Stripe')
    })
  })
})
