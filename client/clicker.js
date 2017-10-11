import $ from 'jquery';

$('a.link').click(function () {
  const $elt = $(this);
  const data = {
    path: window.location.pathname,
    label: $elt.text(),
    href: $elt.attr('href'),
  };
  $.post('/api/link-clicks', data);
});
