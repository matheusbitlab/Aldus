export class AppError extends Error {
  constructor(public readonly code: string, message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "AppError";
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, cause?: unknown) { super("DATABASE_ERROR", message, cause); this.name = "DatabaseError"; }
}

export class NetworkError extends AppError {
  constructor(message: string, public readonly status?: number, cause?: unknown) { super("NETWORK_ERROR", message, cause); this.name = "NetworkError"; }
}
