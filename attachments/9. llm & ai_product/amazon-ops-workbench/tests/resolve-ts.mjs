import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    try { return next(specifier, context); } catch { return next(`${specifier}.ts`, context); }
  }
  return next(specifier, context);
} });
