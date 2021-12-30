import {readFileSync} from "fs";
import {resolve} from "path";

let __dirname = new URL('', import.meta.url).pathname;
if (process.platform === 'win32') {
  __dirname = __dirname.slice(1); // On Windows, the path starts with a unneeded slash
}

function getApplicationDataPathForOS() {
  if (process.env.APPDATA) {
      return process.env.APPDATA;
  }
  switch (process.platform) {
      case 'darwin':
          return process.env.HOME + '/Library/Application Support';
      case 'win32':
      case 'win64':
          return process.env.APPDATA;
      default:
          return process.env.HOME + '/.local/share';
  }
}

export const packageConfig = JSON.parse(readFileSync(
  resolve(__dirname, "../../package.json"),
));

export const historyFilePathOld = resolve(__dirname, "../../history.json");
export const saveFolder = resolve(getApplicationDataPathForOS(), packageConfig.name);
export const historyFilePath = resolve(saveFolder, "history.json");
export const configFilePath = resolve(saveFolder, "config.json");

export default {
  packageConfig: packageConfig,
  historyFilePathOld: historyFilePathOld,
  saveFolder: saveFolder,
  historyFilePath: historyFilePath,
  configFilePath: configFilePath,
}
