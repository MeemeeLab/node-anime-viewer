import {readFileSync} from "fs";
import {resolve} from "path";

let __dirname = new URL('', import.meta.url).pathname;
if (process.platform === 'win32') {
  __dirname = __dirname.slice(1); // On Windows, the path starts with a unneeded slash
}

export const packageConfig = JSON.parse(readFileSync(
  resolve(__dirname, "../../package.json"),
));

export const historyFilePath = resolve(__dirname, "../../history.json");

export default {
  packageConfig: packageConfig,
  historyFilePath: historyFilePath
}
