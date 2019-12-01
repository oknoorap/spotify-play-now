import { writeFileSync } from "fs";
import { basename } from "path";
import mkdirp from "mkdirp";

export default (path: string, status: string) => {
  const dir = basename(path);
  mkdirp.sync(dir);
  writeFileSync(path, status);
};
