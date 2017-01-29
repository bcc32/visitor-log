module.exports = {
  entry: './client/main.js',
  output: {
    path: './public',
    filename: 'bundle.js',
  },
  module: {
    loaders: [
      { test: /\.css$/, loader: 'style-loader!css-loader' },
    ],
  },
};
