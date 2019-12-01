import { writeFileSync } from "fs";
import { dirname } from "path";
import mkdirp from "mkdirp";

export default (path: string, status: string) => {
  const dir = dirname(path);
  mkdirp.sync(dir);
  writeFileSync(path, status);
};
