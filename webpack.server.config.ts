import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type { Configuration } from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';
import nodeExternals from 'webpack-node-externals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = (_env: unknown, argv: { mode?: string }): Configuration => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    target: 'node', // Important: target Node.js, not browser
    entry: './src/index.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'index.cjs', // Use .cjs extension for CommonJS output
      clean: true, // Clean dist folder before build
      libraryTarget: 'commonjs2', // Output CommonJS for Node.js
    },
    externals: [
      nodeExternals(), // Exclude node_modules from bundle
    ],
    externalsPresets: {
      node: true, // Treat built-in Node.js modules as external
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true, // Faster builds, skip type checking
            },
          },
          exclude: /node_modules/,
        },
      ],
    },
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: false, // Keep console.log for server logs
              drop_debugger: isProduction,
              passes: 2, // More aggressive optimization
            },
            mangle: {
              keep_classnames: true, // Keep class names for debugging
              keep_fnames: true, // Keep function names for stack traces
            },
            format: {
              comments: false,
            },
          },
          extractComments: false,
        }),
      ],
    },
    devtool: isProduction ? 'source-map' : 'inline-source-map',
    performance: {
      hints: false, // Server bundles can be larger
    },
  };
};

export default config;
