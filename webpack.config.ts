import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type { Configuration } from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = (env: unknown, argv: { mode?: string }): Configuration => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    entry: {
      theme: './public/js/theme.js',
      sorting: './public/js/sorting.js',
      'tailwind-config': './public/js/tailwind-config.js',
    },
    output: {
      path: path.resolve(__dirname, 'public/js'),
      filename: isProduction ? '[name].min.js' : '[name].js',
      clean: false, // Never clean - keep source files
    },
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: isProduction, // Remove console.log in production
              drop_debugger: isProduction,
              pure_funcs: isProduction ? ['console.log', 'console.info'] : [],
            },
            format: {
              comments: false, // Remove comments
            },
          },
          extractComments: false,
        }),
      ],
    },
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    },
  };
};

export default config;
