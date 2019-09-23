require('dotenv').config()
// Require file system module
const fs = require('fs')

// Require AWS SDK for Node.js
const AWS = require('aws-sdk')

// Config AWS to use our region
AWS.config.update({region: 'us-east-1'})

// Create S3 service object
const s3 = new AWS.S3({apiVersion: '2006-03-01'})

const fileUploadApi = (key, file) => {
  return new Promise((resolve, reject) => {
    const uploadParams = {
      Bucket: process.env.BUCKET_NAME,
      Key: 'anything',
      Body: '',
      ACL: 'public-read'
    }

    // call S3 to retrieve upload file to specified bucket
    s3.upload(uploadParams, function (err, data) {
      if (err) {
        reject(err)
      } else if (data) {
        resolve(data)
      }
    })
  })
}

module.exports = fileUploadApi
