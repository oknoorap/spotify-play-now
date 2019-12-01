import chalk from "chalk";

export const info = (message: any) => {
  console.log(chalk`[ {cyan info} ]`, message);
};

export const error = (message: any, isExit?: boolean) => {
  console.error(chalk`[ {red error} ]`, message);
  if (isExit) {
    process.exit();
  }
};
