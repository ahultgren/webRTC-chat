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
      socket = io.connect();


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

    channels[data.from] = pc1.createDataChannel('sendDataChannel', { reliable: false });
    channels[data.from].onmessage = handleMessage;

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

    console.log(event);

    if (data.op == 'file-data') {
      handleFileData(channel, data.hash, data.contents);
    }
    else if (data.op === 'send-msg') {
      exports.handleSentMsg(data.alias, data.message);
    }
  }

  function handleFileRequest (channel, hash) {
    var file = files[hash],
        fileReader;

    if (!file) {
      return;
    }

    fileReader = new FileReader();

    fileReader.onload = function (event) {
      fileContents = event.target.result;

      if (fileContents) {
        channel.send(JSON.stringify({
          'op': 'file-data',
          'hash': hash,
          'contents': fileContents.substr(0, 100) // only support first few bytes for now
        }));
      }
    };

    fileReader.readAsText(file);
  }


  /**
   * Public methods
   */

  exports.handleFileData = function (channel, hash, contents) {
    var hashCell = $('<td></td>').text(hash);
    var contentsCell = $('<td></td>').text(contents);

    $('<tr></tr>').append(hashCell).append(contentsCell).appendTo('#received');
  };

  exports.handleSentMsg = function (alias, text) {
    app.main.addMessage({ alias: alias, text: text });
  };

  exports.sendMsg = function (alias, message) {
    for (var peerId in channels) {
      if (channels.hasOwnProperty(peerId)) {
        channels[peerId].send(JSON.stringify({
          op: 'send-msg',
          alias: alias,
          message: message
        }));
      }
    }
  };
}(app.rtc = {}));
