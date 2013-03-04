module.exports = WSFTPClient

require('mkee')(WSFTPClient)
require('mkstream')(WSFTPClientRequest)

function WSFTPClient(url, options){
  var _this = Object.create(WSFTPClient.prototype)
  _this.url = url
  _this.options = options
  _this.requestId = 0
  _this.requests = []
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
  var id = this.requestId++

  //request.id = id
  //request.client = this

  this.requests[id] = request

  if(cb){
    request.once('stat', function(stat){
      if(stat.directory){
        request.once('directoryStats', function(directoryStats){
          cb(null, stat, directoryStats)
        })
      } else {
        cb(null, stat, request)
      }
    })
  }

  request.on('end', function(){
    self.requests[id] = null
  })

  request.on('error', function(error){
    self.requests[id] = null
  })

  return request
}

function WSFTPClientRequest(ws, url, options){
  var _this = Object.create(WSFTPClientRequest.prototype)

  _this.ws = ws
  _this.options = options
  _this.readable = true

  var firstResponseRecieved = false

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
      if(data.error)
        _this.emit('error', e)
      else if(data.stat)
        _this.emit('stat', data.stat)
      else if(data.directoryStats)
        _this.emit('directoryStats', data.directoryStats)
    } else if(data.constructor.name == "ArrayBuffer"){
      _this.emit('data', data)
    } else {
      _this.emit('error', new Error('Unknown Data Type'))
    }
  }

  function onClose(e){
    _this.emit('end')
  }
}
