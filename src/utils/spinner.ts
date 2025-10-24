const spinnerFrames = ["⣾", "⣷", "⣯", "⣟", "⡿", "⢿", "⣻", "⣽"];

export class Spinner {
  private interval?: Timer;
  private currentFrame = 0;

  start(): void {
    this.interval = setInterval(() => {
      process.stdout.write(`\r${spinnerFrames[this.currentFrame]}`);
      this.currentFrame = (this.currentFrame + 1) % spinnerFrames.length;
    }, 100);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      process.stdout.write("\r");
    }
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    this.start();
    try {
      return await task();
    } finally {
      this.stop();
    }
  }
}

export async function withSpinner<T>(task: () => Promise<T>): Promise<T> {
  const spinner = new Spinner();
  return spinner.run(task);
}
