(function (exports, $) {
  var MAX_QUEUE = 10,
      MAX_SKIPS = 10,
      CRON_TIME = 100;

  exports.files = {};

  function File (data) {
    var that = this;

    this.name = '';
    this.owner = '';
    this.peerId = '';
    this.pieces = [];
    this.size = 0;
    this.pieceSize = 0;

    $.extend(this, data);
    
    this.allPieces = _.extend([], this.pieces);
    this.queued = [];
    this.complete = $.Deferred();

    this.complete.done(this.done);

    app.files.create(this.name, this.size, function (localFileId) {
      that.id = localFileId;
      that.cron();
    });
  }

  File.prototype.pieceRecieved = function(index, data) {
    var that = this,
        start = index * that.pieceSize,
        allPieces = that.allPieces,
        l;

    for(i = 0; i < index; i++) {
      if(!allPieces[i].hasData) {
        start -= that.pieceSize;
      }
    }

    allPieces[index].hasData = true;

    app.files.write(this.id, data, start, function (error, e) {
      if(error) {
        allPieces[index].hasData = false;
      }
    });

    that.cleanUpQueue();
    that.queue();
  };

  File.prototype.cleanUpQueue = function() {
    var i,
        queued = this.queued;

    for(i = queued.length; i--;) {
      if(queued[i].hasData) {
        queued.splice(i, 1);
      }
    }
  };

  File.prototype.queue = function() {
    var i, l;
console.log(this.pieces.length, this.queued.length);
    if(!this.pieces.length && !this.queued.length) {
      //## delete this?
      return this.complete.resolve(this.name);
    }

    while(this.queued.length < MAX_QUEUE && this.pieces.length) {
      this.queued.push(this.pieces.splice(0, 1)[0]);
    }

    for(i = 0, l = this.queued.length; i < l; i++) {
      if(!this.queued[i].isRequested || this.queued[i].isSkipped > MAX_SKIPS) {
        app.rtc.send({}, { id: this.owner }, { id: this.peerId, piece: i }, { op: 'request-piece' });
        this.queued[i].isRequested++;
        this.isSkipped = 0;
      }
      else {
        this.queued[i].isSkipped++;
      }
    }
  };

  File.prototype.cron = function() {
    var that = this;

    that.queue();

    if(this.complete.state() === 'pending') {
      window.setTimeout(function () {
        that.cron();
      }, CRON_TIME);
    }
  };

  exports.getFile = function (data, callback) {
    var size = data.content.size,
        pieceCount = data.content.count,
        pieceSize = data.content.pieceSize,
        lastPieceSize = data.content.lastSize,
        name = data.from.id + data.content.id,
        pieces = [],
        i;

    for(i = 0; i <= pieceCount; i++) {
      pieces.push({
        index: i,
        size: i !== pieceCount && pieceSize || lastPieceSize,
        isRequested: 0,
        isSkipped: 0,
        hasData: false
      });
    }

    exports.files[name] = new File({
      name: name,
      owner: data.from.id,
      peerId: data.content.id,
      pieces: pieces,
      size: size,
      pieceSize: pieceSize,
      done: callback
    });
  };

  // content: from: { id: }, to: {}, { id: Id, piece: { index: Id, data: String } }, meta: {}
  exports.pieceRecieved = function (data) {
    var name = data.from.id + data.content.id;

    if(exports.files[name]) {
      exports.files[name].pieceRecieved(data.content.piece.index, data.content.piece.data);
    }
  }
}(app.pieceFetcher = {}, jQuery));
