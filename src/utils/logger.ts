/**
 * ロギングユーティリティ
 * 開発環境でのみログを出力し、本番環境では無効化
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isDevelopment: boolean;

  constructor() {
    // 開発環境の判定（ブラウザ環境を想定）
    this.isDevelopment =
      (typeof window !== 'undefined' &&
       (window.location?.hostname === 'localhost' ||
        window.location?.hostname === '127.0.0.1' ||
        window.location?.hostname === ''));
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
