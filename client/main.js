// static assets
require('./style.less');

// Code syntax highlighting
require('highlight.js/styles/solarized-light.css');
const hljs = require('highlight.js/lib/highlight');
hljs.registerLanguage('cpp', require('highlight.js/lib/languages/cpp'));
hljs.registerLanguage('ocaml', require('highlight.js/lib/languages/ocaml'));
hljs.initHighlightingOnLoad();

function poll() {
  $.get('/api/messages/update')
    .done(() => {
      location.reload();
    });
}

$(() => {
  const $messageForm = $('#message-form');
  const $message = $('#message');

  $messageForm.submit((e) => {
    e.preventDefault();
    const message = $message.val();
    $.post('/api/messages', { message })
      .done(() => {
        $message.val('');
        location.reload();
      });
  });

  $message.focus();
  poll();

  $('a.link').click(function () {
    const $elt = $(this);
    const data = {
      path: location.pathname,
      label: $elt.text(),
      href: $elt.attr('href'),
    };
    $.post('/api/link-clicks', data);
  });
});
