import chalk from "chalk";

class Logger {
  private prefix(): string {
    return (
      chalk.bold.yellow("[") +
      chalk.bold.magenta("sprout") +
      chalk.bold.yellow("]") +
      "\t"
    );
  }

  info(message: string): void {
    console.log(`${this.prefix()}${message}`);
  }

  success(message: string): void {
    console.log(`${this.prefix()}${chalk.green("[SUCCESS]")} ${message}`);
  }

  error(message: string, error?: unknown): void {
    console.log(`${this.prefix()}${chalk.red("[ERROR]")} ${message}`);
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
      if (error.stack) {
        console.error(chalk.gray(error.stack));
      }
    } else if (error) {
      console.error(error);
    }
  }

  warning(message: string): void {
    console.log(`${this.prefix()}${chalk.yellow("[WARNING]")} ${message}`);
  }

  detected(system: string): void {
    console.log(
      `${this.prefix()}${chalk.green("[DETECTED]")} Build system:\t${chalk.blue(system)}`,
    );
  }

  skipped(message: string): void {
    console.log(`${this.prefix()}${chalk.green("[SKIPPED]")} ${message}`);
  }

  building(pkgName: string): void {
    process.stdout.write(
      `${this.prefix()}${chalk.blue("Building")} ${pkgName} `,
    );
  }

  installing(pkgName: string): void {
    process.stdout.write(
      `${this.prefix()}${chalk.blue("Installing")} ${pkgName} `,
    );
  }

  removing(pkgName: string): void {
    process.stdout.write(
      `${this.prefix()}${chalk.blue("Removing")} ${pkgName} `,
    );
  }

  linking(): void {
    process.stdout.write(`${this.prefix()}${chalk.blue("Linking")} `);
  }

  clearLine(): void {
    process.stdout.write("\r\x1b[K");
  }

  newLine(): void {
    console.log();
  }

  plain(message: string): void {
    console.log(message);
  }
}

export const logger = new Logger();
