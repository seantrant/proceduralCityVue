module.exports = {
  lintOnSave: false,
  transpileDependencies: [],
  chainWebpack: (config) => {
    config.resolve.extensions
      .merge(['.ts']);

    config.module
      .rule('ts')
      .test(/\.ts$/)
      .use('babel-loader')
      .loader('babel-loader')
      .end();

    // remove ProgressPlugin added by older vue-cli tooling to avoid
    // incompatibilities between plugin options and the installed webpack
    // version (prevents 'Progress Plugin Invalid Options' at runtime).
    config.plugins.delete('progress');
  },
};
