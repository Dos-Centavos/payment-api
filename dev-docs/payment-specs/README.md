Token Tiger Payment Specs
================================

Sync Users Workflow
------------------

* Already registered users
Already registered users will be added to the payment-api database using a script.

* Future users
Users who register after the update will automatically also be registered in the payment-api.

Following the 2 steps above will ensure that each user is registered in the payment-api.

### The users model in payment-api contains the following properties:

* `_id`
* `email` (unique)
* `username`
* `password`
* `pearsonId` (user id in pearson-api - unique) (this value will be useful later to interact with certain pearson-api endpoints)
* `walletIndex` (index of the path derived from the main wallet - unique)
* `walletaddress` (bch address of the path derived from the main wallet - unique)

* All unique properties prevent the creation of double users with the same data.
* The `walletIndex` value starts from 0 for the first user and is increased by 1 for subsequent users.
* The derived path used is `m/44'/245'/0'/0/${walletIndex}`


