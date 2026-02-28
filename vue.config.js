module.exports = {
  lintOnSave: false,
  transpileDependencies: [],
  chainWebpack: config => {
    // remove ProgressPlugin added by older vue-cli tooling to avoid
    // incompatibilities between plugin options and the installed webpack
    // version (prevents 'Progress Plugin Invalid Options' at runtime).
    config.plugins.delete('progress')
  }
}
