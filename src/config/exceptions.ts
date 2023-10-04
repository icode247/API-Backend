export class ValidationError extends Error {
  constructor(message = '') {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends Error {
  status: number;
  constructor(message = '') {
    super(message);
    this.name = 'UnauthorizedError';
    this.status = 401;
  }
}

export class EmailAlreadyExistsError extends ValidationError {
  message = 'Email address already taken.';
}
