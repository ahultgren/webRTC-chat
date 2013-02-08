var app = {};

(function (exports) {
  var Message = Backbone.Model.extend({
        url: '/'
      }),
      Messages = Backbone.Collection.extend({
        model: Message
      }),

      OutView = Backbone.View.extend({
        events: {
          'submit form': 'sendMessage'
        },
        initialize: function () {
          this.collection.on('add', this.clearMessage, this);
        },
        sendMessage: function (e) {
          var that = this,
              alias = that.$('.alias').val(),
              message = that.$('.message').val();

          e.preventDefault();

          if(message){
            app.rtc.sendMsg(alias, message);

            that.collection.create({
              alias: alias,
              text: message
            });
          }
        },
        clearMessage: function () {
          this.$('.message').val('').focus();
        }
      }),
      InView = Backbone.View.extend({
        initialize: function () {
          this.collection.on('add', this.appendMessage, this);
        },
        appendMessage: function (message) {
          this.$('ul').append($('<li></li>').text(message.get('alias') + ': ' + message.get('text')));
        }
      });

  jQuery(function ($) {
    var messages = new Messages();

    exports.outView = new OutView({
      el: $('#outbox'),
      collection: messages
    });

    exports.inView = new InView({
      el: $('#inbox'),
      collection: messages
    });

    exports.addMessage = function (message) {
      exports.inView.collection.create(message);
    };
  });
}(app.main = {}));
