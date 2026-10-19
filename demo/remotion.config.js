// The video is plain JSX, without TypeScript (whose tsconfig.json Remotion would
// otherwise read the JSX setting from): use React's automatic JSX runtime.
import { Config } from "@remotion/cli/config";

Config.overrideWebpackConfig((config) => ({
  ...config,
  module: {
    ...config.module,
    rules: config.module.rules.map((rule) =>
      String(rule.test) === String(/\.jsx?$/)
        ? {
            ...rule,
            use: rule.use.map((u) =>
              u.loader?.includes("esbuild-loader") ? { ...u, options: { ...u.options, jsx: "automatic" } } : u,
            ),
          }
        : rule,
    ),
  },
}));
