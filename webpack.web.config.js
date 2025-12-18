const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/web/index.tsx',
  output: {
    filename: 'web.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    fallback: {
      "path": false,
      "fs": false,
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/web/index.html',
      filename: 'index.html',
    }),
  ],
  target: 'web',
  mode: process.env.NODE_ENV || 'development',
  devtool: 'source-map',
};

