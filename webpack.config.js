const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './src/js/game/Game.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/index.html', to: '.' },
        { from: 'src/styles', to: 'styles' },
        { from: 'src/js', to: 'js' }
      ]
    })
  ],
  resolve: {
    extensions: ['.js'],
    fallback: {
      "path": false,
      "fs": false
    }
  }
};

// Add to your webpack config for production
module.exports = {
  ...module.exports,
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
          },
        },
      }),
    ],
  }
}