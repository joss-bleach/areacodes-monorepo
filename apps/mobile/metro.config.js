const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Force singleton packages to resolve to a single physical copy, preventing
// multiple React instances when workspace packages are bundled.
//
// extraNodeModules alone is insufficient: it's only a *fallback* consulted
// when normal resolution fails. The `convex` package is hoisted to the root
// node_modules and resolves `react` to the root copy (19.2.4) directly, while
// React Native renders with the app's pinned copy (19.0.0). Two React
// instances => null dispatcher => "Cannot read property 'useRef' of null" /
// invalid hook call inside ConvexProviderWithAuth.
//
// resolveRequest intercepts EVERY resolution regardless of origin, so we pin
// these singletons for every importer. Dirs are resolved dynamically from the
// app so each points at its real location regardless of how Bun hoists it
// (react stays app-local at 19.0.0; react-native lives at the workspace root).
const singletonDir = (name) =>
  path.dirname(require.resolve(`${name}/package.json`, { paths: [projectRoot] }));

const singletons = {
  react: singletonDir("react"),
  "react-native": singletonDir("react-native"),
};

config.resolver.extraNodeModules = singletons;

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Match `react`, `react-native`, and their subpaths (e.g. react/jsx-runtime
  // or react-native/Libraries/...), but not unrelated packages like
  // react-native-maps that merely share the prefix.
  for (const [name, dir] of Object.entries(singletons)) {
    if (moduleName === name || moduleName.startsWith(`${name}/`)) {
      const subpath = moduleName.slice(name.length); // "" or "/jsx-runtime"
      // Re-resolve against the canonical dir; context.resolveRequest still
      // applies platform extensions (.ios.js) and source exts for subpaths.
      return context.resolveRequest(context, `${dir}${subpath}`, platform);
    }
  }
  const fallback = defaultResolveRequest ?? context.resolveRequest;

  // Workspace TS packages (e.g. @areacodes/domain) are consumed as source and
  // use NodeNext-style specifiers — relative imports carry an explicit ".js"
  // extension even though the file on disk is ".ts" (tsc/Vite resolve this
  // automatically in "Bundler" moduleResolution mode). Metro treats an
  // explicit extension as literal and won't substitute ".ts"/".tsx", so retry
  // with the TS extension when the literal ".js"/".jsx" request fails.
  if (
    (moduleName.startsWith("./") || moduleName.startsWith("../")) &&
    /\.jsx?$/.test(moduleName)
  ) {
    try {
      return fallback(context, moduleName, platform);
    } catch (error) {
      const tsModuleName = moduleName.replace(/\.jsx$/, ".tsx").replace(/\.js$/, ".ts");
      return fallback(context, tsModuleName, platform);
    }
  }

  return fallback(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
