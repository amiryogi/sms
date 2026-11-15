module.exports = function (api) {
  api.cache(true);
  return {
    // NativeWind compiles className into styles; Reanimated's worklets plugin
    // is added by babel-preset-expo itself.
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
  };
};
