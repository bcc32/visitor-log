import babel    from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import json     from 'rollup-plugin-json';
import resolve  from 'rollup-plugin-node-resolve';
import uglify   from 'rollup-plugin-uglify';

const clientPlugins = [
  resolve(),
  commonjs(),
];

if (process.env.NODE_ENV === 'production') {
  clientPlugins.push(babel({
    exclude: 'node_modules/**'
  }));
  clientPlugins.push(uglify());
}

function client(entry, dest) {
  return {
    entry,
    dest,
    format: 'iife',
    plugins: clientPlugins,
  };
}

const serverPlugins = [
  json(),
  babel({
    exclude: 'node_modules/**',
    runtimeHelpers: true,
  }),
];

function server(entry, dest) {
  return {
    entry,
    dest,
    format: 'cjs',
    plugins: serverPlugins,
  };
}

export default [
  client('client/clicker.js',       'dist/clicker.js'),
  client('client/message-log.js',   'dist/message-log.js'),
  client('client/url-shortener.js', 'dist/url-shortener.js'),
  server('server/main.js',          'index.js')
];
