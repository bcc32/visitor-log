// static assets
require('./style.css');
var $ = require('jquery');

$(function() {
  $('#message-form').submit(function postMessage(e) {
    e.preventDefault();
    var message = $('#message').val();
    $.post('/api/messages', { message: message })
      .always(function() {
        location.reload();
      });
  });

  $('#message').focus();
});
