export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code = "API_ERROR",
  ) {
    super(message);
  }
}

export function assertFound<T>(value: T | null | undefined, message = "Not found"): T {
  if (!value) {
    throw new ApiError(404, message, "NOT_FOUND");
  }

  return value;
}
