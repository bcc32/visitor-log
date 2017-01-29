// static assets
require('./style.css');

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
