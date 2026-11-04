export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function notFound(): never {
  throw new AppError(404, "NOT_FOUND", "Не удалось найти запись.");
}
