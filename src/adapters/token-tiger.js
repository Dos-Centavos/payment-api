/*
  This adapter handles the connection with tokentiger.com API
*/
import axios from 'axios'
class TokenTiger {
  constructor (localConfig = {}) {
    // Encapsulate dependencies
    this.config = localConfig.config

    // Bind functions
    this.auth = this.auth.bind(this)
    this.addCredits = this.addCredits.bind(this)
  }

  // tokentiger.com auth
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

      const result = await axios(options)
      const data = result.data
      this.jwt = data.token
      return data.token
    } catch (error) {
      console.log(error.message)
      throw error
    }
  }

  // Adds credits to a tokentiger user
  async addCredits ({ qty, userId }) {
    try {
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
      const result = await axios(options)
      const data = result.data
      return data
    } catch (error) {
      throw error
    }
  }
}

export default TokenTiger
