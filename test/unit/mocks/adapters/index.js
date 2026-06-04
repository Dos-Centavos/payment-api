/*
  Mocks for the Adapter library.
*/

class IpfsAdapter {
  constructor() {
    this.ipfs = {
      files: {
        stat: () => { }
      }
    }
  }
}

class IpfsCoordAdapter {
  constructor() {
    this.ipfsCoord = {
      adapters: {
        ipfs: {
          connectToPeer: async () => { }
        }
      },
      useCases: {
        peer: {
          sendPrivateMessage: () => { }
        }
      },
      thisNode: {}
    }
  }
}

const ipfs = {
  ipfsAdapter: new IpfsAdapter(),
  ipfsCoordAdapter: new IpfsCoordAdapter(),
  getStatus: async () => { },
  getPeers: async () => { },
  getRelays: async () => { }
}
ipfs.ipfs = ipfs.ipfsAdapter.ipfs

const localdb = {
  Users: class Users {
    static findById() { }
    static find() { }
    static findOne() {
      return {
        validatePassword: localdb.validatePassword
      }
    }

    async save() {
      return {}
    }

    generateToken() {
      return '123'
    }

    toJSON() {
      return {}
    }

    async remove() {
      return true
    }

    async validatePassword() {
      return true
    }
  },
  Payments: class Payments {
    constructor (data = {}) {
      this._id = '_id'
      this.type = data.type
      this.userId = data.userId
      this.paymentMethod = data.paymentMethod || 'Blockchain'
      this.status = 'in-process'
    }

    static findById () { }
    static find () { }
    static findOne () {
    }

    async save () {
      return {}
    }

    toJSON () {
      return {}
    }

    async remove () {
      return true
    }

  },

  validatePassword: () => {
    return true
  }
}
class Wallet {
  constructor() { }
  _instanceWallet() { }
}
class TokenTiger {
  constructor() { }
  addCredits() { }
  auth() { }
}

class StripeAdapter {
  constructor () { }
  createCheckoutSession () {
    return Promise.resolve({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/test'
    })
  }
  createPaymentIntent () {
    return Promise.resolve({
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret'
    })
  }
  retrieveCheckoutSession () {
    return Promise.resolve({
      id: 'cs_test_123',
      payment_status: 'paid',
      metadata: { paymentId: '_id' }
    })
  }
  retrievePaymentIntent () {
    return Promise.resolve({
      id: 'pi_test_123',
      status: 'succeeded',
      object: 'payment_intent',
      metadata: { paymentId: '_id' }
    })
  }
  expireCheckoutSession () {
    return Promise.resolve(true)
  }
  cancelPaymentIntent () {
    return Promise.resolve(true)
  }
}

export default {
  ipfs,
  localdb,
  wallet: new Wallet(),
  tokenTiger: new TokenTiger(),
  stripe: new StripeAdapter()
};
