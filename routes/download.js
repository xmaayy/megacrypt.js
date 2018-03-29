const express = require('express')
const mega = require('megajs')
const router = express.Router()
const megacrypt = require('../modules/megacrypt.js')
const config = require('../config')

//Ge params from url
//Type: Either '!' or '_', ! indicates folder, _ indicates a single file
router.get('/:type/:crypt', function (req, res, next) {

  //Decrypt megaurl with custom megacrypt module
  let decrypt = megacrypt.decryptUrl(req.params.crypt, req.params.type)

  //Dont know when this will be the case, but this is just a straight download
  if (req.params.type === '_') {
    let file = new mega.File({downloadId: decrypt.fileId, key: decrypt.fileKey, directory: false})
    file.loadAttributes((err, file) => {
      if (err) throw err
      res.setHeader('Content-Length', file.size)
      res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`)
      file.download({returnCiphertext: config.returnCiphertext}).pipe(res)
    })
  //This is the most common type
  } else if (req.params.type === '!') {
    let folder = new mega.File({downloadId: decrypt.folderId, key: decrypt.fileKey, directory: true})
    folder.loadAttributes((err, folder) => {
      if (err) throw err

      //Set resource headers and pipe download file to user
      let downloadFile = file => {
        res.setHeader('Content-Length', file.size)
        res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`)
        file.download({returnCiphertext: config.returnCiphertext}).pipe(res)
      }

      //If the arg is not a folder, check if the file is the one we want
      //If both true, start the download process
      //Otherwise recursively traverse dirs to get links to all files
      let findFile = file => {
        if (!file.directory && file.downloadId.toString() === decrypt.fileId) {
            console.log(file.downloadId.toString())
            return downloadFile(file)
        } else {
          file.children.forEach(findFile)
        }
      }
      folder.children.forEach(findFile)
    })
  }
})

module.exports = router
