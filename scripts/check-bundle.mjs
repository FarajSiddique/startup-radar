// Imports the built Lambda bundle as a real ES module, the way the Lambda runtime does.
// Catches bundling bugs (e.g. "Dynamic require of node:https") that typecheck and esbuild miss.
// Don't replace with `node -e`: eval mode exposes a global require and hides exactly this class of bug.
import { pathToFileURL } from "node:url";

const mod = await import(pathToFileURL("dist/handler.mjs").href);
if (typeof mod.handler !== "function") throw new Error("dist/handler.mjs does not export handler()");
console.log("Bundle loads as ESM and exports handler()");
