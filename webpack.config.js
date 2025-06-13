const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    popup: './src/popup/popup.ts',
    content: './src/content/content.ts',
    background: './src/background/background.ts',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  devtool: 'source-map',
};