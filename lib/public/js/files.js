(function (exports) {
  exports.files = [];
  exports.totalSize = 0;

  window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

  function errorHandler(e) {
    var msg = '';

    switch (e.code) {
      case FileError.QUOTA_EXCEEDED_ERR:
        msg = 'QUOTA_EXCEEDED_ERR';
        break;
      case FileError.NOT_FOUND_ERR:
        msg = 'NOT_FOUND_ERR';
        break;
      case FileError.SECURITY_ERR:
        msg = 'SECURITY_ERR';
        break;
      case FileError.INVALID_MODIFICATION_ERR:
        msg = 'INVALID_MODIFICATION_ERR';
        break;
      case FileError.INVALID_STATE_ERR:
        msg = 'INVALID_STATE_ERR';
        break;
      default:
        msg = 'Unknown Error';
        break;
    };

    console.log('Error: ' + msg, e);
  }

  exports.add = function (file, callback) {
    var id = exports.files.push(null) - 1;

    window.requestFileSystem(window.TEMPORARY, exports.totalSize += file.size, function (fs) {
      fs.root.getFile(id, { create: true }, function (entry) {
        entry.createWriter(function (writer) {
          writer.write(file);
          exports.files.splice(id, 0, entry);
          callback(id);
        }, errorHandler);
      }, errorHandler);
    }, errorHandler);
  };

  exports.read = function (index, start, length, callback) {
    if(exports.files[index]) {
      exports.files[index].file(function (file) {
        var reader = new FileReader(),
            piece;

        start = start || 0;
        length = length || file.size;
        piece = file.slice(start, start + length, 'text/plain');

        reader.onloadend = function(e){
          callback(this.result);
        };

        reader.onerror = errorHandler;

        reader.readAsText(piece);
      });
    }
  };

  exports.create = function (name, size, callback) {
    window.requestFileSystem(window.TEMPORARY, exports.totalSize += size, function (fs) {
      fs.root.getFile(name, { create: true, exclusive: true }, function (entry) {
        entry.createWriter(function (writer) {
          // Fill the file with null characters. Makes writing to the middle much
          // easier but certainly wastes memory for larger files
          writer.write(new Blob([new Array(size).join('\0')], {type: 'text/plain'}));
          callback(exports.files.push(entry) - 1);
        }, errorHandler);
      }, errorHandler);
    }, errorHandler);
  };

  exports.write = function (id, data, position, callback) {
    if(exports.files[id]) {
      exports.files[id].createWriter(function (writer) {
        writer.onwriteend = function (e) {
          callback(null, e);
        };

        writer.onerror = function (e) {
          callback(e);
        };

        writer.seek(position);
        writer.write(new Blob([data], {type: 'text/plain'}));
      }, errorHandler);
    }
  };

  exports.getFile = function (index, callback) {
    if(exports.files[index]) {
      exports.files[index].file(callback, errorHandler);
    }
    else {
      callback(null);
    }
  };

  exports.getURL = function (name, callback) {
    window.requestFileSystem(window.TEMPORARY, exports.totalSize, function (fs) {
      fs.root.getFile(name, { create: false }, function (entry) {
        callback(entry.toURL());
      }, errorHandler);
    }, errorHandler);
  };

  exports.delete = function (id, callback) {
    
  };
}(app.files = {}));
