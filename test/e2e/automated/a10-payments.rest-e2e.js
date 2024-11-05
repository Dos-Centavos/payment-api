import testUtils from '../../utils/test-utils.js'
import { assert } from 'chai'
import config from '../../../config/index.js'
import axios from 'axios'
import sinon from 'sinon'
import util from 'util'

util.inspect.defaultOptions = { depth: 1 }

const LOCALHOST = `http://localhost:${config.port}`

const context = {}

let sandbox

// const mockContext = require('../../unit/mocks/ctx-mock').context

if (!config.noMongo) {
  describe('Users', () => {
    before(async () => {
      // console.log(`config: ${JSON.stringify(config, null, 2)}`)

      // Create a second test user.
      const userObj = {
        email: 'test2@test.com',
        password: 'pass2',
        name: 'test2'
      }
      const testUser = await testUtils.createUser(userObj)
      // console.log(`testUser2: ${JSON.stringify(testUser, null, 2)}`)

      context.user = testUser.user
      context.token = testUser.token
      context.id = testUser.user._id

      // Get the JWT used to log in as the admin 'system' user.
      const adminJWT = await testUtils.getAdminJWT()
      console.log(`adminJWT: ${adminJWT}`)
      context.adminJWT = adminJWT

      // const admin = await testUtils.loginAdminUser()
      // context.adminJWT = admin.token

      // const admin = await adminLib.loginAdmin()
      // console.log(`admin: ${JSON.stringify(admin, null, 2)}`)
    })

    beforeEach(() => {
      sandbox = sinon.createSandbox()
    })

    afterEach(() => sandbox.restore())

    describe('POST /payments - Create Payment', () => {
      it('should not create payment if the authorization header is missing', async () => {
        try {
          const options = {
            method: 'post',
            url: `${LOCALHOST}/payments`,
            headers: {
              Accept: 'application/json'
            },
            data: {
              userId: context.id,
              type: 1
            }
          }
          await axios(options)

          assert.equal(true, false, 'Unexpected behavior')
        } catch (err) {
          console.log(err)
          assert.equal(err.response.status, 401)
        }
      })

      it('should not create payment if the authorization header is missing the scheme', async () => {
        try {
          const options = {
            method: 'post',
            url: `${LOCALHOST}/payments`,
            headers: {
              Accept: 'application/json',
              Authorization: '1'
            },
            data: {
              userId: context.id,
              type: 1
            }
          }

          await axios(options)

          assert.equal(true, false, 'Unexpected behavior')
        } catch (err) {
          assert.equal(err.response.status, 401)
        }
      })

      it('should not fetch users if the authorization header has invalid scheme', async () => {
        const { token } = context
        try {
          const options = {
            method: 'post',
            url: `${LOCALHOST}/payments`,
            headers: {
              Accept: 'application/json',
              Authorization: `Unknown ${token}`
            },
            data: {
              userId: context.id,
              type: 1
            }
          }

          await axios(options)

          assert.equal(true, false, 'Unexpected behavior')
        } catch (err) {
          assert.equal(err.response.status, 401)
        }
      })

      it('should not create payment if token is invalid', async () => {
        try {
          const options = {
            method: 'post',
            url: `${LOCALHOST}/payments`,
            headers: {
              Accept: 'application/json',
              Authorization: 'Bearer 1'
            },
            data: {
              userId: context.id,
              type: 1
            }
          }

          await axios(options)

          assert.equal(true, false, 'Unexpected behavior')
        } catch (err) {
          assert.equal(err.response.status, 401)
        }
      })
    })

    describe('GET /payments', () => {
      it('should not fetch payments if the authorization header is missing', async () => {
        try {
          const options = {
            method: 'GET',
            url: `${LOCALHOST}/payments`,
            headers: {
              Accept: 'application/json'
            }
          }
          await axios(options)

          assert.equal(true, false, 'Unexpected behavior')
        } catch (err) {
          console.log(err)
          assert.equal(err.response.status, 401)
        }
      })

      it('should not fetch payments if the authorization header is missing the scheme', async () => {
        try {
          const options = {
            method: 'GET',
            url: `${LOCALHOST}/payments`,
            headers: {
              Accept: 'application/json',
              Authorization: '1'
            }
          }
          await axios(options)

          assert.equal(true, false, 'Unexpected behavior')
        } catch (err) {
          assert.equal(err.response.status, 401)
        }
      })

      it('should not fetch payments if the authorization header has invalid scheme', async () => {
        const { token } = context
        try {
          const options = {
            method: 'GET',
            url: `${LOCALHOST}/payments`,
            headers: {
              Accept: 'application/json',
              Authorization: `Unknown ${token}`
            }
          }
          await axios(options)

          assert.equal(true, false, 'Unexpected behavior')
        } catch (err) {
          assert.equal(err.response.status, 401)
        }
      })

      it('should not fetch payments if token is invalid', async () => {
        try {
          const options = {
            method: 'GET',
            url: `${LOCALHOST}/payments`,
            headers: {
              Accept: 'application/json',
              Authorization: 'Bearer 1'
            }
          }
          await axios(options)

          assert.equal(true, false, 'Unexpected behavior')
        } catch (err) {
          assert.equal(err.response.status, 401)
        }
      })

      it('should fetch all payments', async () => {
        const { token } = context

        const options = {
          method: 'GET',
          url: `${LOCALHOST}/payments`,
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
        const result = await axios(options)

        const payments = result.data.payments
        assert.isArray(payments)
      })
    })

    describe('GET /payments/:id', () => {
      it('should not fetch payment if token is invalid', async () => {
        try {
          const options = {
            method: 'GET',
            url: `${LOCALHOST}/payments/1`,
            headers: {
              Accept: 'application/json',
              Authorization: 'Bearer 1'
            }
          }
          await axios(options)

          assert.equal(true, false, 'Unexpected behavior')
        } catch (err) {
          assert.equal(err.response.status, 401)
        }
      })

      it("should throw 404 if payment doesn't exist", async () => {
        const { token } = context

        try {
          const options = {
            method: 'GET',
            url: `${LOCALHOST}/payments/5fa4bd7ee1828f5f4d8ed004`,
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`
            }
          }
          await axios(options)

          assert.equal(true, false, 'Unexpected behavior')
        } catch (err) {
          assert.equal(err.response.status, 404)
        }
      })
    })

    describe('PUT /cancel/:id', () => {
      it('should not update payment if token is invalid', async () => {
        try {
          const options = {
            method: 'PUT',
            url: `${LOCALHOST}/payments/cancel/1`,
            headers: {
              Accept: 'application/json',
              Authorization: 'Bearer 1'
            }
          }
          await axios(options)

          assert.equal(true, false, 'Unexpected behavior')
        } catch (err) {
          assert.equal(err.response.status, 401)
        }
      })
    })

    describe('DELETE /payments/:id', () => {
      it('should not delete payment if token is invalid', async () => {
        try {
          const options = {
            method: 'DELETE',
            url: `${LOCALHOST}/payments/1`,
            headers: {
              Accept: 'application/json',
              Authorization: 'Bearer 1'
            }
          }
          await axios(options)

          assert.equal(true, false, 'Unexpected behavior')
        } catch (err) {
          assert.equal(err.response.status, 401)
        }
      })

      it('should throw 401 if deleting invalid payment', async () => {
        const { token } = context

        try {
          const options = {
            method: 'DELETE',
            url: `${LOCALHOST}/payments/1`,
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`
            }
          }
          await axios(options)

          assert.equal(true, false, 'Unexpected behavior')
        } catch (err) {
          assert.equal(err.response.status, 401)
        }
      })
    })
  })
}
