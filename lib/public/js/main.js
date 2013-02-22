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

          this.clearMessage();
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
        notificationsOn: false,
        events: {
          'click input[type="checkbox"]': 'handleToggle'
        },
        initialize: function () {
          this.collection.on('add', this.alert, this);
        },
        handleToggle: function (e) {
          var element = $(e.toElement),
              status;

          if(element.hasClass('sounds')) {
            this.soundsOn = element.is(':checked');
          }
          else if(element.hasClass('popups')) {
            status = element.is(':checked');

            if(status && window.webkitNotifications && window.webkitNotifications.checkPermission() !== 0) {
              window.webkitNotifications.requestPermission();
            }
            
            this.notificationsOn = status;
          }
        },
        alert: function (message) {
          // If the message is not from this user and the user is somewhere else, notify
          if(!message.get('self') && !exports.window.isFocus) {
            if(this.soundsOn) {
              this.makeSound(message);
            }
            if(this.notificationsOn) {
              this.showNotification(message);
            }
          }
        },
        makeSound: function (message) {
          new Howl({
            urls: ['/sounds/notification.wav']
          }).play();
        },
        showNotification: function (message) {
          var notification;

          if(window.webkitNotifications.checkPermission() === 0) {
            notification = window.webkitNotifications
              .createNotification('http://placehold.it/48x48', 'RTCChat ', message.get('alias') + ' says: ' + message.get('text').substring(0, 60) + (message.get('text') > 60 && '...' || ''));
            
            notification.show();

            setTimeout(function(){
              notification.cancel()
            }, 2500);
          }
        }
      }),
      WindowView = Backbone.View.extend({
        isFocus: true,
        events: {
          'focus': 'focus',
          'blur': 'blur'
        },
        focus: function (e) {
          this.isFocus = true;
        },
        blur: function (e) {
          this.isFocus = false;
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

    exports.window = new WindowView({
      el: $(window)
    });

    exports.addMessage = function (message) {
      exports.inView.collection.create(message);
    };
  });
}(app.main = {}));
