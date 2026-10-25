export class RepositoryError extends Error {
  readonly operation: string
  readonly originalError: unknown

  constructor(operation: string, originalError: unknown) {
    const detail =
      originalError instanceof Error ? originalError.message : String(originalError)
    super(`${operation} failed: ${detail}`)
    this.name = "RepositoryError"
    this.operation = operation
    this.originalError = originalError
  }
}

export function toRepositoryError(
  operation: string,
  error: unknown
): RepositoryError {
  return error instanceof RepositoryError
    ? error
    : new RepositoryError(operation, error)
}
