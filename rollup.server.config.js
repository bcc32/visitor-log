import babel  from 'rollup-plugin-babel';
import json   from 'rollup-plugin-json';

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
  server('server/main.js', 'index.js')
];
