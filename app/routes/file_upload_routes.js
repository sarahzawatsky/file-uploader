// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// require Multer for file upload
const multer = require('multer')
const upload = multer({ storage: multer.memoryStorage() })

// pull in Mongoose model for fileUploads
const FileUpload = require('../models/file_upload')

// pull in Mongoose model for fileUploads
const fileUploadApi = require('../../lib/fileUploadApi')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// this is middleware that will remove blank fields from `req.body`, e.g.
// { fileUpload: { title: '', text: 'foo' } } -> { fileUpload: { text: 'foo' } }
const removeBlanks = require('../../lib/remove_blank_fields')
// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// INDEX
// GET /fileUploads
router.get('/fileUploads', requireToken, (req, res, next) => {
  FileUpload.find()
    .then(fileUploads => {
      // `fileUploads` will be an array of Mongoose documents
      // we want to convert each one to a POJO, so we use `.map` to
      // apply `.toObject` to each one
      return fileUploads.map(fileUpload => fileUpload.toObject())
    })
    // respond with status 200 and JSON of the fileUploads
    .then(fileUploads => res.status(200).json({ fileUploads: fileUploads }))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// SHOW
// GET /fileUploads/5a7db6c74d55bc51bdf39793
router.get('/fileUploads/:id', requireToken, (req, res, next) => {
  // req.params.id will be set based on the `:id` in the route
  FileUpload.findById(req.params.id)
    .then(handle404)
    // if `findById` is succesful, respond with 200 and "fileUpload" JSON
    .then(fileUpload => res.status(200).json({ fileUpload: fileUpload.toObject() }))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// CREATE
// POST /fileUploads
router.post('/fileUploads', upload.single('upload'), (req, res, next) => {
  // set owner of new fileUpload to be current user
  // req.body.fileUpload.owner = req.user.id
  console.log(req.file)
  fileUploadApi(req.file.originalname, req.file.buffer)
    .then(console.log)
  // FileUpload.create(req.body.fileUpload)
  //   // respond to succesful `create` with status 201 and JSON of new "fileUpload"
  //   .then(fileUpload => {
  //     res.status(201).json({ fileUpload: fileUpload.toObject() })
  //   })
    // if an error occurs, pass it off to our error handler
    // the error handler needs the error message and the `res` object so that it
    // can send an error message back to the client
    .catch(next)
})

// UPDATE
// PATCH /fileUploads/5a7db6c74d55bc51bdf39793
router.patch('/fileUploads/:id', requireToken, removeBlanks, (req, res, next) => {
  // if the client attempts to change the `owner` property by including a new
  // owner, prevent that by deleting that key/value pair
  delete req.body.fileUpload.owner

  FileUpload.findById(req.params.id)
    .then(handle404)
    .then(fileUpload => {
      // pass the `req` object and the Mongoose record to `requireOwnership`
      // it will throw an error if the current user isn't the owner
      requireOwnership(req, fileUpload)

      // pass the result of Mongoose's `.update` to the next `.then`
      return fileUpload.updateOne(req.body.fileUpload)
    })
    // if that succeeded, return 204 and no JSON
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// DESTROY
// DELETE /fileUploads/5a7db6c74d55bc51bdf39793
router.delete('/fileUploads/:id', requireToken, (req, res, next) => {
  FileUpload.findById(req.params.id)
    .then(handle404)
    .then(fileUpload => {
      // throw an error if current user doesn't own `fileUpload`
      requireOwnership(req, fileUpload)
      // delete the fileUpload ONLY IF the above didn't throw
      fileUpload.deleteOne()
    })
    // send back 204 and no content if the deletion succeeded
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

module.exports = router
