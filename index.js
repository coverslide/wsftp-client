'use strict'

module.exports = WSFTPClient

require('mkee')(WSFTPClient)
require('mkstream')(WSFTPClientRequest)
var Buffer = require('buffer').Buffer

function WSFTPClient(url, options){
  var _this = Object.create(WSFTPClient.prototype)
  _this.url = url
  _this.options = options
  _this.requestId = 0
  return _this
}

WSFTPClient.prototype.request = function request(url, options, cb){

  if(typeof options == 'function'){
    cb = options
    options = null
  }

  var self = this
  var ws = new WebSocket(this.url)
  var request = new WSFTPClientRequest(ws, url, options) 

  if(cb){
    request.once('stat', function(stat){
      cb(null, stat, request)
    })
  }

  request.on('error', function(error){
    if(cb) cb(error)
  })

  return request
}

function WSFTPClientRequest(ws, url, options){
  var _this = Object.create(WSFTPClientRequest.prototype)
  var ended = false

  _this.ws = ws
  _this.options = options
  _this.readable = true

  ws.binaryType = 'arraybuffer'
  ws.addEventListener('message', onMessage, false)
  ws.addEventListener('open', onOpen, false)
  ws.addEventListener('close', onClose, false)

  return _this

  function send(data){
    ws.send(JSON.stringify(data))
  }

  function onOpen(e){
    send({url: url, options: options})
  }

  function onMessage(message){
    var data = message.data
    if(typeof data == 'string'){
      try{
        data = JSON.parse(data)
      } catch(e){
        return _this.emit('error', e)
      }
      if(data.error){
        _this.emit('error', new Error(data.error))
      }else if(data.filename){
        _this.emit('filestat', data)
      }else if(data.stat){
        _this.emit('stat', data.stat)
      }else if (data.end){
        _this.emit('end')
        ended = true    
      }
    } else if(data instanceof Buffer){
      _this.emit('data', data)
    } else if(data instanceof ArrayBuffer){
      _this.emit('data', new Buffer(new Uint8Array(data)))
    } else {
      _this.emit('error', new Error('Unknown Data Type'))
    }
  }

  function onClose(e){
    if(!ended){
      _this.emit('error', new Error('Socket closed prematurely'))
    }
    _this.emit('close', e)
  }
}
