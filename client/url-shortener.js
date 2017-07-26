import UrlShortener from '../lib/js/client/url_shortener.js';
import $ from 'jquery';

$(() => {
  UrlShortener.main($('#app')[0]);
});
