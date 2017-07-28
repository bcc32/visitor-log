import babel    from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import resolve  from 'rollup-plugin-node-resolve';
import uglify   from 'rollup-plugin-uglify';

function rollup({ entry, dest }) {
  const plugins = [
    resolve(),
    commonjs(),
  ];

  if (process.env.NODE_ENV === 'production') {
    plugins.push(babel({
      exclude: 'node_modules/**'
    }));
    plugins.push(uglify());
  }

  return {
    entry,
    dest,
    format: 'iife',
    plugins,
  };
}

export default [
  { entry: 'client/main.js', dest: 'dist/bundle.js' },
  { entry: 'client/url-shortener.js', dest: 'dist/url-shortener.bundle.js' }
].map(rollup);
