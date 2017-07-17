// Code syntax highlighting
import hljs from 'highlight.js/lib/highlight';
import cpp from 'highlight.js/lib/languages/cpp';
import ocaml from 'highlight.js/lib/languages/ocaml';
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('ocaml', ocaml);
hljs.initHighlightingOnLoad();

// Elm components
import Elm from './elm/Messages.js';

import $ from 'jquery';

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
