// static assets
require('bootstrap-loader');

$(() => {
  const $messageForm = $('#message-form');
  const $message = $('#message');

  $messageForm.submit((e) => {
    e.preventDefault();
    const message = $message.val();
    $.post('/api/messages', { message })
      .always(() => location.reload());
  });

  $message.focus();
});
