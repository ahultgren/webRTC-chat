(function (exports) {
  var RTCPeerConnection = window.PeerConnection || window.webkitPeerConnection00 || window.webkitRTCPeerConnection,
      servers = {
        iceServers: [{ 'url': 'stun:stun.l.google.com:19302' }]
      },
      options = {
        optional: [{ RtpDataChannels: true }]
      },
      peers = {},
      channels = {},
      socket = io.connect(),
      MAX_PIECE_SIZE = 100;


  /**
   * Connect to sockets
   */

  socket.on('candidate', function (data) {
    if (data.candidate && peers[data.from]) {
      console.log(data.candidate.candidate);
      peers[data.from].addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  });

  socket.on('new', function (data) {
    var pc1 = peers[data.from] = new RTCPeerConnection(servers, options);
    pc1.onicecandidate = iceCallback;
    pc1.onstatechange = getStateChangeCallback(data.from);

    channels[data.from] = pc1.createDataChannel('sendDataChannel', { reliable: false, outOfOrderAllowed: true, maxRetransmitNum: 0 });
    channels[data.from].onmessage = handleMessage;
    channels[data.from].onerror = function () {
      console.log("RTC ERROR", arguments);
    };
    channels[data.from].onclose = function () {
      console.log("RTC CLOSE", arguments);
    };

    pc1.createOffer(function (desc) {
      pc1.setLocalDescription(desc);
      socket.emit('offer', { 'to': data.from, 'desc': desc });
    });
  });

  socket.on('offer', function (data) {
    var pc2 = peers[data.from] = new RTCPeerConnection(servers, options);

    pc2.onicecandidate = iceCallback;
    pc2.onstatechange = getStateChangeCallback(data.from);

    pc2.ondatachannel = function (event) {
      channels[data.from] = event.channel;
      channels[data.from].onmessage = handleMessage;
      channels[data.from].onerror = function () {
        console.log("RTC ERROR", arguments);
      };
      channels[data.from].onclose = function () {
        console.log("RTC CLOSE", arguments);
      };
    };

    pc2.setRemoteDescription(new RTCSessionDescription(data.desc));

    pc2.createAnswer(function (desc) {
      pc2.setLocalDescription(desc);
      socket.emit('answer', { 'to': data.from, 'desc': desc });
    });
  });

  socket.on('answer', function (data) {
    peers[data.from].setRemoteDescription(new RTCSessionDescription(data.desc));
  });

  socket.on('id', function (data) {
    exports.ownId = data.id;
  });


  /**
   * Private methods
   */

  function iceCallback (event) {
    if (event.candidate) {
      socket.emit('candidate', { 'candidate': event.candidate });
    }
  }

  function getStateChangeCallback (peerId) {
    return function (event) {
      if ($('#clients .' + peerId).length == 0) {
        $('<tr class="' + peerId + '"><td>' + peerId + '</td><td class="state"></td></tr>')
          .appendTo('#clients');
      }

      $('#clients .' + peerId + ' .state').text(peers[peerId].readyState);
    };
  }

  function handleMessage (event) {
    var channel = event.srcElement,
        data = JSON.parse(event.data);

    console.log(event, data);

    switch (data.meta.op) {
      case 'send-msg':
      case 'send-file':
        exports.recieveMessage(data);
        break;
      case 'request-file':
        sendFileMeta(data);
        break;
      case 'pieces-info':
        requestPieces(data);
        break;
      case 'request-piece':
        sendPiece(data);
        break;
      case 'send-piece':
        pieceRecieved(data);
        break;
    }
  }

  function sendFileMeta (data) {
    app.files.getFile(data.content.id, function (file) {
      var pieces = ~~(file.size / MAX_PIECE_SIZE) + 1,
          last = file.size % MAX_PIECE_SIZE;

      exports.send({}, { to: data.from.id }, { id: data.content.id, size: file.size, count: pieces, pieceSize: MAX_PIECE_SIZE, lastSize: last, name: file.name }, { op: 'pieces-info' });
    });
  }

  function requestPieces (data) {
    //## Confirm that this client has actually requested the file?
    // Get pieces
    app.pieceFetcher.getFile(data, function (id) {
      // All pieces fetched
      app.files.getURL(id, function (url) {
        app.main.addMessage({ from: { id: 0, alias: 'System' }, to: data.to, content: { message: 'File ready to be saved: ', downloadURL: url, name: data.content.name }, meta: { op: 'download-url' } });
      });
    });
  }

  function sendPiece (data) {
    app.files.read(data.content.id, data.content.piece * MAX_PIECE_SIZE, MAX_PIECE_SIZE, function (piece) {
      exports.send({}, { id: data.from.id }, { id: data.content.id, piece: { index: data.content.piece, data: piece } }, { op: 'send-piece' });
    });
  }

  function pieceRecieved (data) {
    app.pieceFetcher.pieceRecieved(data);
  }


  /**
   * Public methods
   */

  // In
  exports.recieveMessage = function (data) {
    app.main.addMessage(data);
  };


  // Out
  exports.sendMsg = function (from, content) {
    exports.send(from, {}, content, { op: 'send-msg' });
  };

  exports.sendFile = function (from, content) {
    exports.send(from, {}, content, { op: 'send-file' });
  };

  exports.requestFile = function (id, peer) {
    exports.send({}, { id: peer }, { id: id }, { op: 'request-file' });
  };

  exports.send = function (from, to, content, meta) {
    var peerId;

    if(!from || !to || !content || !meta) {
      throw new Error('Not enough parameters for rtc.send.');
    }

    from.id = exports.ownId;

    if(to.id) {
      send(to.id);
    }
    else {
      for (peerId in channels) {
        if (channels.hasOwnProperty(peerId)) {
          send(peerId);
        }
      }
    }

    function send (peerId) {
      channels[peerId].send(JSON.stringify({
        from: from,
        to: to,
        content: content,
        meta: meta
      }));
    }
  };
}(app.rtc = {}));
