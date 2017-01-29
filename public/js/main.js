$(function() {
  $('#message-form').submit(function postMessage(e) {
    e.preventDefault();
    var message = $('#message').val();
    $.post('/api/messages', { message: message })
      .always(function() {
        location.reload();
      });
  });
});
