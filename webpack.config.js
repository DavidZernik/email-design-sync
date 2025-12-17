const path = require('path');

module.exports = [
  {
    entry: './code.ts',
    output: {
      filename: 'code.js',
      path: path.resolve(__dirname, 'dist'),
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    target: 'node',
    mode: 'development',
  },
  {
    entry: './src/ui/index.tsx',
    output: {
      filename: 'ui.js',
      path: path.resolve(__dirname, 'dist'),
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
    target: 'web',
    mode: 'development',
  },
];

