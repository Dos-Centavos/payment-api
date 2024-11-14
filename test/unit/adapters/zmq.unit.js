import { assert } from 'chai'
import ZMQLib from '../../../src/adapters/zmq.js'
import sinon from 'sinon'
import adaptersMock from '../mocks/adapters/index.js'
import mockData from '../mocks/zmq-mock.js'
let uut
let sandbox

describe('#ZMQjs', () => {
  beforeEach(() => {
    const localConfig = { config: {}, localdb: adaptersMock.localdb }
    uut = new ZMQLib(localConfig)

    sandbox = sinon.createSandbox()
  })

  afterEach(() => sandbox.restore())

  describe('connect()', () => {
    it('should handle connection error', async () => {
      try {
        sandbox.stub(uut.sock, 'connect').throws(new Error('test error'))
        await uut.connect()
        assert.fail('Unexpected code path.')
      } catch (err) {
        assert.include(err.message, 'test error')
      }
    })

    it('Should connect', async () => {
      try {
        sandbox.stub(uut.sock, 'connect').returns()
        sandbox.stub(uut.sock, 'subscribe').returns()

        const result = await uut.connect()
        assert.isTrue(result)
      } catch (err) {
        assert.fail('Unexpected code path.')
      }
    })
  })
  describe('disconnect()', () => {
    it('Should disconnect', async () => {
      sandbox.stub(uut.sock, 'close').returns()
      const result = await uut.disconnect()
      assert.isTrue(result)
    })
  })

  describe('#decodeMsg', () => {
    it('should decode an SLP transaction', () => {
      // Assert that the TX queue is empty at the start of the test.
      assert.equal(uut.txQueue.length, 0)

      const topic = Buffer.from(mockData.topic01, 'hex')
      const message = Buffer.from(mockData.msg01, 'hex')

      const result = uut.decodeMsg(topic, message)

      assert.equal(result, true)

      // Assert that the queue now has a transaction in it.
      assert.equal(uut.txQueue.length, 1)
    })

    it('should decode a new block', () => {
      // Assert that the TX queue is empty at the start of the test.
      assert.equal(uut.txQueue.length, 0)

      const topic = Buffer.from(mockData.blockTopic, 'hex')
      const message = Buffer.from(mockData.blockMsg, 'hex')

      const result = uut.decodeMsg(topic, message)

      assert.equal(result, true)

      // Assert that the queue now has a transaction in it.
      assert.equal(uut.blockQueue.length, 1)
    })

    it('should catch errors and return false', async () => {
      const topic = Buffer.from(mockData.topic01, 'hex')
      const message = Buffer.from(mockData.msg01, 'hex')

      // Force an error
      sandbox.stub(uut.bchZmqDecoder, 'decodeTransaction').throws(new Error('test error'))

      const result = uut.decodeMsg(topic, message)

      assert.equal(result, false)
    })
  })

  describe('reviewOutputAddresses()', () => {
    it('should review output addresses', async () => {
      sandbox.stub(uut, 'reviewAddress').resolves()
      const txMock = {
        outputs: [
          { scriptPubKey: { addresses: ['1NoYQso5UF6XqC4NbjKAp2EnjJ59yLNn74'] } }
        ]
      }
      const result = await uut.reviewOutputAddresses(txMock)
      assert.isTrue(result)
    })
    it('should handle multiples outputs', async () => {
      sandbox.stub(uut, 'reviewAddress').resolves()
      const txMock = {
        outputs: [
          { scriptPubKey: { addresses: ['1NoYQso5UF6XqC4NbjKAp2EnjJ59yLNn74'] } },
          { scriptPubKey: { addresses: ['1NoYQso5UF6XqC4NbjKAp2EnjJ59yLNn74', '1NoYQso5UF6XqC4NbjKAp2EnjJ59yLNn74'] } }
        ]
      }
      const result = await uut.reviewOutputAddresses(txMock)
      assert.isTrue(result)
    })
    it('should handle empty addresses ', async () => {
      sandbox.stub(uut, 'reviewAddress').resolves()
      const txMock = {
        outputs: [
          { scriptPubKey: { addresses: [] } },
          { scriptPubKey: { addresses: ['1NoYQso5UF6XqC4NbjKAp2EnjJ59yLNn74'] } }
        ]
      }
      const result = await uut.reviewOutputAddresses(txMock)
      assert.isTrue(result)
    })
    it('should handle unknow address format ', async () => {
      sandbox.stub(uut, 'reviewAddress').resolves()
      const txMock = {
        outputs: [
          { scriptPubKey: { addresses: ['unknow'] } }
        ]
      }
      const result = await uut.reviewOutputAddresses(txMock)
      assert.isTrue(result)
    })
    it('should return false on error', async () => {
      const result = await uut.reviewOutputAddresses(null)
      assert.isFalse(result)
    })
  })

  describe('reviewAddress()', () => {
    it('should return false if provided address is not found', async () => {
      sandbox.stub(uut.localdb.Users, 'findOne').resolves(null)

      const addr = 'bitcoincash:qqfx3wcg8ts09mt5l3zey06wenapyfqq2qrcyj5x0s'
      const result = await uut.reviewAddress(addr, mockData.txMock)

      assert.isFalse(result)
    })
    it('should update owner user if address exist', async () => {
      const userMock = { save: () => {} }
      const paymentMock = { txs: [], save: () => {} }

      sandbox.stub(uut.localdb.Users, 'findOne').resolves(userMock)
      sandbox.stub(uut.localdb.Payments, 'findOne')
        .onCall(0).resolves(null) //  Resolves an existing tx
        .onCall(1).resolves(paymentMock) // Resolves current user payment model

      const addr = 'bitcoincash:qqfx3wcg8ts09mt5l3zey06wenapyfqq2qrcyj5x0s'
      const result = await uut.reviewAddress(addr, mockData.txMock)

      assert.isObject(result)
      assert.isNumber(result.lastPaymentTime)
    })
    it('should not update owner user if tx already hanlded', async () => {
      const userMock = { save: () => {} }
      const paymentMock = { txs: [], save: () => {} }

      sandbox.stub(uut.localdb.Users, 'findOne').resolves(userMock)
      sandbox.stub(uut.localdb.Payments, 'findOne')
        .onCall(0).resolves(paymentMock) // Resolves an existing tx

      const addr = 'bitcoincash:qqfx3wcg8ts09mt5l3zey06wenapyfqq2qrcyj5x0s'
      const result = await uut.reviewAddress(addr, mockData.txMock)

      assert.isFalse(result)
    })
    it('should return false on error', async () => {
      sandbox.stub(uut.localdb.Users, 'findOne').throws(new Error())

      const addr = 'bitcoincash:qqfx3wcg8ts09mt5l3zey06wenapyfqq2qrcyj5x0s'
      const result = await uut.reviewAddress(addr, mockData.txMock)

      assert.isFalse(result)
    })
  })
})
