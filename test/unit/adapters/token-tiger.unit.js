import { assert } from 'chai'
import TokenTigerLib from '../../../src/adapters/token-tiger.js'
import sinon from 'sinon'

let uut
let sandbox

describe('#tokentiger.js', () => {
  beforeEach(() => {
    const localConfig = { pearsonApiUrl: 'token tiger server' }
    uut = new TokenTigerLib(localConfig)

    sandbox = sinon.createSandbox()
  })

  afterEach(() => sandbox.restore())

  describe('#constructor', () => {
    it('should throw an error if auth server is not specified', () => {
      try {
        uut = new TokenTigerLib()

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(
          err.message,
          'Must pass a url for the Token Tiger AUTH server when instantiating TokenTiger class.'
        )
      }
    })
  })

  describe('auth()', () => {
    it('should handle axios request', async () => {
      try {
        sandbox.stub(uut.axios, 'request').throws(new Error('test error'))
        await uut.auth()
        assert.fail('Unexpected code path.')
      } catch (err) {
        assert.include(err.message, 'test error')
      }
    })

    it('Should auth', async () => {
      try {
        sandbox.stub(uut.axios, 'request').resolves({ data: { token: 'Bearer ...' } })
        await uut.auth()
        assert.isString(uut.jwt)
        assert.equal(uut.jwt, 'Bearer ...')
      } catch (err) {
        assert.fail('Unexpected code path.')
      }
    })
  })

  describe('addCredits()', () => {
    it('should throw error if input is missing', async () => {
      try {
        await uut.addCredits()
        assert.fail('Unexpected code path.')
      } catch (err) {
        assert.include(err.message, 'qty is required')
      }
    })
    it('should throw error if qty is not provided', async () => {
      try {
        const inObj = {}
        await uut.addCredits(inObj)
        assert.fail('Unexpected code path.')
      } catch (err) {
        assert.include(err.message, 'qty is required')
      }
    })
    it('should throw error if userId is not provided', async () => {
      try {
        const inObj = { qty: 1 }

        await uut.addCredits(inObj)
        assert.fail('Unexpected code path.')
      } catch (err) {
        assert.include(err.message, 'userId is required')
      }
    })
    it('should handle axios request', async () => {
      try {
        sandbox.stub(uut.axios, 'request').throws(new Error('test error'))

        const inObj = { qty: 1, userId: 'token tiger id' }
        await uut.addCredits(inObj)

        assert.fail('Unexpected code path.')
      } catch (err) {
        assert.include(err.message, 'test error')
      }
    })

    it('Should add credits', async () => {
      try {
        sandbox.stub(uut.axios, 'request').resolves({ data: {} })

        const inObj = { qty: 1, userId: 'token tiger id' }

        const result = await uut.addCredits(inObj)
        assert.isObject(result)
      } catch (err) {
        assert.fail('Unexpected code path.')
      }
    })
  })
})
