(() => {
  // The require scope
  var __webpack_require__ = {};

  // webpack/runtime/rspack_version
  (() => {
    __webpack_require__.rv = () => '2.0.0-beta.2';
  })();
  // webpack/runtime/rspack_unique_id
  (() => {
    __webpack_require__.ruid = 'bundler=rspack@2.0.0-beta.2';
  })();
  postMessage("I'm working before postMessage");

  onmessage = (event) => {
    postMessage(`Message sent: ${event.data}`);
  };
})();
