// Front-end
import Messages from '../lib/js/client/messages.js';
import $ from 'jquery';

$(() => {
  Messages.main($('#app')[0]);

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
