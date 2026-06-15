const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    popup: './src/popup.js',
    content: './src/content.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    alias: {
      // Le package partagé est exposé en TypeScript (main: index.ts) ;
      // on pointe directement la source pour que ts-loader la compile.
      '@sges/i18n': path.resolve(__dirname, '..', '..', 'packages', 'i18n', 'index.ts'),
    },
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'popup.html',
      template: './src/popup/index.html',
      chunks: ['popup'],
    }),
    new CopyPlugin({
      patterns: [{ from: 'manifest.json', to: 'manifest.json' }],
    }),
  ],
};
