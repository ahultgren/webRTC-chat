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
          'submit form': 'sendMessage',
        },
        initialize: function () {
          this.$el.drop({
            dropHandler: this.sendFile.bind(this)
          });
        },
        sendMessage: function (e) {
          var that = this,
              alias = that.$('.alias').val(),
              message = that.$('.message').val();

          e.preventDefault();

          if(message){
            app.rtc.sendMsg({ alias: alias }, { message: message });

            that.collection.create({
              self: true,
              from: { alias: alias },
              content: { message: message }
            });
          }

          this.clearMessage();
        },
        clearMessage: function () {
          this.$('.message').val('').focus();
        },
        sendFile: function (file) {
          var that = this,
              alias = that.$('.alias').val(),
              message = 'Hey guys! Have a file: ';

          app.files.add(file, function (fileId) {
            app.rtc.sendFile({ alias: alias }, { message: message, fileId: fileId, fileName: file.name });

            that.collection.create({
              self: true,
              from: { alias: alias },
              content: {
                message: message,
                fileId: fileId,
                fileName: file.name
              }
            });
          });
        }
      }),

      InView = Backbone.View.extend({
        events: {
          'click .file': 'requestFile'
        },
        initialize: function () {
          this.collection.on('add', this.appendMessage, this);
        },
        appendMessage: function (message) {
          var content = $('<li></li>');

          content.append(message.get('from').alias + ': ' + message.get('content').message);

          if(message.get('content').fileId !== undefined) {
            content.append('<a href="#" class="file" data-id="' + message.get('content').fileId + '" data-from="' + message.get('from').id + '">' + message.get('content').fileName + '</a>');
          }
          else if(message.get('content').downloadURL !== undefined) {
            content.append('<a href="' + message.get('content').downloadURL + '" class="download" download="' + message.get('content').name + '">' + message.get('content').name + '</a>');
          }

          this.$('ul').append(content);
        },
        requestFile: function (e) {
          var file = $(e.target);

          e.preventDefault();
console.log("request file in backbone", file, file.attr('data-id'));
          app.rtc.requestFile(file.attr('data-id'), file.attr('data-from'));
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
              .createNotification('http://placehold.it/48x48', 'RTCChat ', message.get('from.alias') + ' says: ' + message.get('content.message').substring(0, 60) + (message.get('content.message') > 60 && '...' || ''));
            
            notification.show();

            setTimeout(function(){
              notification.cancel();
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
    if (!window.File && !window.FileReader && !window.FileList && !window.Blob) {
      return alert('Sorry you need a less retarded browser. Try Chrome Canary or Firefox Nightly');
    }

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
