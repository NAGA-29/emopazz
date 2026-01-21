/**
 * ロギングユーティリティ
 * 開発環境でのみログを出力し、本番環境では無効化
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isDevelopment: boolean;

  constructor() {
    // 開発環境の判定
    this.isDevelopment =
      typeof process !== 'undefined' &&
      process.env?.NODE_ENV === 'development' ||
      location?.hostname === 'localhost' ||
      location?.hostname === '127.0.0.1';
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console[level](message, ...args);
    }
  }

  public info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }

  public warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }

  public error(message: string, ...args: unknown[]): void {
    // エラーは常に出力
    // eslint-disable-next-line no-console
    console.error(message, ...args);
  }

  public debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args);
  }
}

export const logger = new Logger();
