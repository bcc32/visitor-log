// static assets
require('./style.less');

// Code syntax highlighting
require('highlight.js/styles/solarized-light.css');
const hljs = require('highlight.js/lib/highlight');
hljs.registerLanguage('cpp', require('highlight.js/lib/languages/cpp'));
hljs.registerLanguage('ocaml', require('highlight.js/lib/languages/ocaml'));
hljs.initHighlightingOnLoad();

// Elm components
const Elm = require('./elm/Messages.elm');

$(() => {
  var node = document.getElementById('elm-app');
  Elm.Main.embed(node);

  const $messageForm = $('#message-form');
  const $message = $('#message');

  $messageForm.submit((e) => {
    e.preventDefault();
    const message = $message.val();
    $.post('/api/messages', { message })
      .done(() => {
        $message.val('');
      });
  });

  $message.focus();

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
