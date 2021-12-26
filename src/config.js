import {readFileSync} from "fs";
import {resolve} from "path";

const __dirname = new URL('', import.meta.url).pathname;
const config = JSON.parse(readFileSync(
  resolve(__dirname, "../../package.json"),
));

export default config;
