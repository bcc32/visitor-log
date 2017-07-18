// Code syntax highlighting
import hljs from 'highlight.js/lib/highlight';
import cpp from 'highlight.js/lib/languages/cpp';
import ocaml from 'highlight.js/lib/languages/ocaml';
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('ocaml', ocaml);
hljs.initHighlightingOnLoad();

// Front-end
import Messages from '../lib/js/client/messages.js';
import $ from 'jquery';

$(() => {
  Messages.main($('#app')[0]);

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
      path: window.location.pathname,
      label: $elt.text(),
      href: $elt.attr('href'),
    };
    $.post('/api/link-clicks', data);
  });
});
