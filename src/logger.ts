class Logger {
  private linePrefix: string;
  private colours = {
    magenta: '\x1b[35m%s\x1b[0m',
    boldRed: '\x1b[1m\x1b[31m%s\x1b[0m',
    boldBlue: '\x1b[1m\x1b[34m%s\x1b[0m',
    boldYellow: '\x1b[1m\x1b[33m%s\x1b[0m',
  };
  today = new Date();

  constructor() {
    const padWithZero = (number: number) => String(number).padStart(2, '0');

    const getDate = () => {
      const year = this.today.getFullYear();
      const month = padWithZero(this.today.getMonth() + 1);
      const date = padWithZero(this.today.getDate());
      return `${year}-${month}-${date}`;
    };

    const getTime = () => {
      const hours = padWithZero(this.today.getHours());
      const minutes = padWithZero(this.today.getMinutes());
      const seconds = padWithZero(this.today.getSeconds());
      return `${hours}:${minutes}:${seconds}`;
    };

    this.linePrefix = this.colourise(`${getDate()} ${getTime()}`, 'magenta');
  }

  private colourise(msg: string, colour: keyof typeof this.colours): string {
    if (!!JSON.parse(process.env.NO_COLOR ?? 'false')) return msg;

    const colourCode = this.colours[colour];
    return colourCode.replace('%s', msg);
  }

  info = (msg: string, ...args: unknown[]): void =>
    console.log(`[${this.colourise('INFO', 'boldBlue')}] [${this.linePrefix}] ${msg}`, ...args);
  warn = (msg: string, ...args: unknown[]): void =>
    console.warn(`[${this.colourise('WARN', 'boldYellow')}] [${this.linePrefix}] ${msg}`, ...args);
  error = (msg: string, ...args: unknown[]): void =>
    console.error(`[${this.colourise('ERROR', 'boldRed')}] [${this.linePrefix}] ${msg}`, ...args);
}

export const logger = new Logger();
