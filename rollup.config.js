import commonjs from 'rollup-plugin-commonjs';
import resolve  from 'rollup-plugin-node-resolve';

export default {
  entry: 'client/main.js',
  dest: 'dist/bundle.js',
  format: 'iife',
  sourceMap: true,
  plugins: [
    resolve({}),
    commonjs(),
  ]
};
