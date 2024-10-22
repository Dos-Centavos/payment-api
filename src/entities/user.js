/*
  User Entity
*/

class User {
  validate ({ email, password, pearsonId } = {}) {
    // Input Validation
    if (!email || typeof email !== 'string') {
      throw new Error("Property 'email' must be a string!")
    }
    if (!password || typeof password !== 'string') {
      throw new Error("Property 'password' must be a string!")
    }

    const userData = { pearsonId, email, password }

    return userData
  }
}

export default User
