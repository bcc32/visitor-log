import commonjs from 'rollup-plugin-commonjs';
import resolve  from 'rollup-plugin-node-resolve';

function rollup({ entry, dest }) {
  return {
    entry,
    dest,
    format: 'iife',
    sourceMap: true,
    plugins: [
      resolve({}),
      commonjs(),
    ]
  };
}

export default [
  { entry: 'client/main.js', dest: 'dist/bundle.js' },
  { entry: 'client/url-shortener.js', dest: 'dist/url-shortener.bundle.js' }
].map(rollup);
