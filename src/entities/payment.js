/*
  User Entity
*/

class User {
  validate ({ userId, type } = {}) {
    // Input Validation
    if (!userId || typeof userId !== 'string') {
      throw new Error("Property 'userId' must be a string!")
    }

    if (!type || typeof type !== 'number') {
      throw new Error("Property 'type' must be a number!")
    }

    const data = { userId, type }

    return data
  }
}

export default User
