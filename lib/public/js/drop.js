(function (exports) {
  function Drop (element, options) {
    var that = this;

    that.settings = {
      dropHandler: function (){}
    };

    $.extend(that.settings, options);
    that.element = element;

    // Stop browser default stuff
    element
      .on('dragenter dragover dragleave', stopEverything)
      .on('drop', stopEverything);

    // Bind events
    element.on('dragenter', that.enter.bind(that));
    element.on('dragover', that.over.bind(that));
    element.on('dragleave', that.leave.bind(that));
    element.on('drop', that.drop.bind(that));

    // Disable dropeffect on document
    $(document).on('dragover', function (e) {
      stopEverything(e);
      e.originalEvent.dataTransfer.dropEffect = 'none';
    });

    return $.extend(that, element);
  }

  Drop.prototype.enter = function(e){
    this.element.css('background-color', '#f00');
  };

  Drop.prototype.over = function(e){
    e.originalEvent.dataTransfer.dropEffect = 'copy';
  };

  Drop.prototype.leave = function(e){
    this.element.css('background-color', '#ff0');
  };

  Drop.prototype.drop = function(e){
    var that = this,
        files = e.originalEvent.dataTransfer.files,
        file, i;

    that.element.css('background-color', '#0f0');

    for(i = 0; file = files[i]; ++i) {
      that.settings.dropHandler(file);
    }
  };


  function stopEverything (e) {
    e.preventDefault();
    e.stopPropagation();
    e.originalEvent.preventDefault();
    e.originalEvent.stopPropagation();
  }


  exports.fn.drop = function (options) {
    var drop = new Drop(this, options);

    return drop;
  };
}(jQuery));