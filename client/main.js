// static assets
require('./style.css');
const $ = require('jquery');

$(() => {
  $('#message-form').submit((e) => {
    e.preventDefault();
    const message = $('#message').val();
    $.post('/api/messages', { message })
      .always(() => location.reload());
  });

  $('#message').focus();
});
