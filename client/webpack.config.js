const CleanPlugin = require('clean-webpack-plugin')
const MiniHtmlWebpackPlugin = require('mini-html-webpack-plugin')
const path = require('path')
const webpack = require('webpack')

const PATHS = {
  dist: path.resolve(__dirname, './public'),
  src: path.resolve(__dirname, './'),
}

module.exports = (env, argv={}) => ({
  devServer: {
    contentBase: PATHS.dist,
    historyApiFallback: true,
    port: 4001,
    stats: 'errors-only',
  },
  devtool: argv.mode === 'development' ? 'eval' : 'source-map',
  entry: ['babel-polyfill', PATHS.src],
  resolve: {
    extensions: ['.js'],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
    ],
  },
  output: {
    filename: 'bundle.js',
    path: PATHS.dist,
    publicPath: '/',
  },
  plugins: [
    new CleanPlugin(['./**/*'], PATHS.dist),
    new MiniHtmlWebpackPlugin({
      context: {
        container: 'Root',
        title: '🔏',
        trimWhitespace: true,
      },
      template: require('@vxna/mini-html-webpack-template'),
    }),
  ],
})
