export class DecryptException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecryptException';
  }
}
