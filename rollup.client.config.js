import babel    from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
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

export default [
  client('client/clicker.js',       'dist/clicker.js'),
  client('client/message-log.js',   'dist/message-log.js'),
  client('client/url-shortener.js', 'dist/url-shortener.js'),
];
