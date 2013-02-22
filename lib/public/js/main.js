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
              self: true,
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
      }),
      NotificationView = Backbone.View.extend({
        soundsOn: false,
        alertsOn: false,
        events: {
          'click input[type="checkbox"]': 'handleToggle'
        },
        initialize: function () {
          this.collection.on('add', this.alert, this);
        },
        handleToggle: function (e) {
          var element = $(e.toElement);

          if(element.hasClass('sounds')) {
            this.soundsOn = element.is(':checked');
          }
          else if(element.hasClass('popups')) {
            this.alertsOn = element.is(':checked');
          }
        },
        alert: function (message) {
          // If the message is not from this user, notify
          if(!message.get('self')) {
            if(this.soundsOn) {
              this.makeSound();
            }
            if(this.alertsOn) {
              this.makeSound();
            }
          }
        },
        makeSound: function (message) {
          //## howler
          new Howl({
            urls: ['/sounds/notification.wav']
          }).play();
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

    exports.notificationView = new NotificationView({
      el: $('#notifications'),
      collection: messages
    });

    exports.addMessage = function (message) {
      exports.inView.collection.create(message);
    };
  });
}(app.main = {}));
