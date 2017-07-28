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

const serverPlugins = [
  babel({
    exclude: 'node_modules/**'
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
  client('client/main.js',          'dist/bundle.js' ),
  client('client/url-shortener.js', 'dist/url-shortener.bundle.js'),
  server('server/main.js',          'index.js'       )
];
