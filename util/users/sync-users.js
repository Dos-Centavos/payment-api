// Sync pearson user to this local db

import axios from 'axios'
import mongoose from 'mongoose'
import config from '../../config/index.js'
import User from '../../src/adapters/localdb/models/users.js'

import Adapters from '../../src/adapters/index.js'
import UseCases from '../../src/use-cases/index.js'

const pearsonAuthEmail = process.env.PEARSON_AUTH_EMAIL
const pearsonAuthPass = process.env.PEARSON_AUTH_PASS
const pearsonApiUrl = process.env.PEARSON_API_URL ? process.env.PEARSON_API_URL : 'http://localhost:5001'

const adapters = new Adapters()
const useCases = new UseCases({ adapters })
const userUsecases = useCases.user

const validator = () => {
  try {
    if (!pearsonAuthEmail) throw new Error('PEARSON_AUTH_EMAIL must be passed as enviroment var.')
    if (!pearsonAuthPass) throw new Error('PEARSON_AUTH_PASS must be passed as enviroment var.')
  } catch (error) {
    console.log(error.message)
    throw error
  }
}
// Auth into pearson-api
const auth = async () => {
  try {
    const options = {
      method: 'post',
      url: `${pearsonApiUrl}/auth`,
      data: {
        email: pearsonAuthEmail,
        password: pearsonAuthPass
      }
    }

    const result = await axios(options)
    const data = result.data
    return data.token
  } catch (error) {
    console.log(error.message)
    throw error
  }
}

// Get all registered pearson-api users.
const getPearsonUsers = async () => {
  try {
    const token = await auth()
    const options = {
      method: 'get',
      url: `${pearsonApiUrl}/users`,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`
      }
    }

    const result = await axios(options)
    const data = result.data
    return data.users
  } catch (error) {
    console.log(error.message)
    throw error
  }
}

const syncUsers = async () => {
  try {
    validator()
    // Connect to the Mongo Database.
    mongoose.Promise = global.Promise
    mongoose.set('useCreateIndex', true) // Stop deprecation warning.
    console.log(`Database : ${config.database}`)
    await mongoose.connect(
      config.database,
      { useNewUrlParser: true, useUnifiedTopology: true }
    )

    const users = await getPearsonUsers()
    console.log(`Total users to sync ${users.length}`)
    for (let i = 0; i < users.length; i++) {
      const { email, _id } = users[i]
      const exist = await User.findOne({ email }, '-password')
      if (exist) {
        console.log(`${email} already exist.`)
        continue
      }

      const userObj = {
        email,
        password: _id,
        pearsonId: _id
      }
      await userUsecases.createUser(userObj)
    }

    mongoose.connection.close()
  } catch (error) {
    console.log(error.message)
    throw error
  }
}

syncUsers()
