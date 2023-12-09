class Logger {
  private colours = {
    magenta: '\x1b[35m%s\x1b[0m',
    boldRed: '\x1b[1m\x1b[31m%s\x1b[0m',
    boldBlue: '\x1b[1m\x1b[34m%s\x1b[0m',
    boldYellow: '\x1b[1m\x1b[33m%s\x1b[0m',
  };

  private colourise(msg: string, colour: keyof typeof this.colours): string {
    if (!!JSON.parse(process.env.NO_COLOR ?? 'false')) return msg;

    const colourCode = this.colours[colour];
    return colourCode.replace('%s', msg);
  }

  private padWithZero(number: number): string {
    return String(number).padStart(2, '0');
  }

  private getDateTime(): string {
    const today = new Date();

    const year = today.getFullYear();
    const month = this.padWithZero(today.getMonth() + 1);
    const date = this.padWithZero(today.getDate());

    const hours = this.padWithZero(today.getHours());
    const minutes = this.padWithZero(today.getMinutes());
    const seconds = this.padWithZero(today.getSeconds());

    return `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`;
  }

  private getLinePrefix(): string {
    return this.colourise(this.getDateTime(), 'magenta');
  }

  info(msg: string, ...args: unknown[]): void {
    console.log(`[${this.colourise('INFO', 'boldBlue')}] [${this.getLinePrefix()}] ${msg}`, ...args);
  }

  warn(msg: string, ...args: unknown[]): void {
    console.warn(`[${this.colourise('WARN', 'boldYellow')}] [${this.getLinePrefix()}] ${msg}`, ...args);
  }

  error(msg: string, ...args: unknown[]): void {
    console.error(`[${this.colourise('ERROR', 'boldRed')}] [${this.getLinePrefix()}] ${msg}`, ...args);
  }
}

export const logger = new Logger();
