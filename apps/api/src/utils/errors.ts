export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export const notFound = (what: string) => new HttpError(404, 'NOT_FOUND', `${what} not found`)
export const badRequest = (msg: string) => new HttpError(400, 'BAD_REQUEST', msg)
export const conflict = (msg: string) => new HttpError(409, 'CONFLICT', msg)
