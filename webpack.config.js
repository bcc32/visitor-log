const webpack = require('webpack');

module.exports = {
  entry: './client/main.js',
  output: {
    path: './public',
    filename: 'bundle.js',
  },
  module: {
    rules: [
      { test: /\.css$/, use: [ 'style-loader', 'css-loader' ] },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        options: { presets: ['es2015'] },
      },
      { test: /\.less$/, use: [ 'style-loader', 'css-loader', 'less-loader' ] },
      { test: /\.woff2?(\?v=\d+\.\d+\.\d+)?$/, use: [{ loader: 'url-loader', options: { limit: 10000, mimetype: 'application/font-woff' } }] },
      { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,    use: [{ loader: 'url-loader', options: { limit: 10000, mimetype: 'application/octet-stream' } }] },
      { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,    use: [ 'file-loader' ] },
      { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,    use: [{ loader: 'url-loader', options: { limit: 10000, mimetype: 'image/svg+xml' } }] },
    ],
  },
  plugins: [
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
    }),
  ],
};
