/*
  This adapter handles the connection with tokentiger.com API
*/
import axios from 'axios'
class TokenTiger {
  constructor (localConfig = {}) {
    // Encapsulate dependencies
    this.config = localConfig
    this.axios = axios

    if (!this.config.pearsonApiUrl || typeof this.config.pearsonApiUrl !== 'string') {
      throw new Error(
        'Must pass a url for the Token Tiger AUTH server when instantiating TokenTiger class.'
      )
    }
    // Bind functions
    this.auth = this.auth.bind(this)
    this.addCredits = this.addCredits.bind(this)
  }

  // tokentiger auth
  async auth () {
    try {
      const options = {
        method: 'post',
        url: `${this.config.pearsonApiUrl}/auth`,
        data: {
          email: this.config.pearsonAuthEmail,
          password: this.config.pearsonAuthPass
        }
      }

      const result = await this.axios.request(options)
      const data = result.data
      this.jwt = data.token
      return data.token
    } catch (error) {
      console.log('Error in token-tiger/auth()')
      throw error
    }
  }

  // Adds credits to a tokentiger user
  async addCredits (inObj = {}) {
    try {
      const { qty, userId } = inObj
      if (!qty) {
        throw new Error('qty is required')
      }
      if (!userId) {
        throw new Error('userId is required')
      }
      const options = {
        method: 'post',
        url: `${this.config.pearsonApiUrl}/users/credit/add`,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.jwt}`
        },
        data: {
          qty,
          userId
        }
      }
      const result = await this.axios.request(options)
      const data = result.data
      return data
    } catch (error) {
      console.log('Error in token-tiger/addCredits()')
      throw error
    }
  }
}

export default TokenTiger
