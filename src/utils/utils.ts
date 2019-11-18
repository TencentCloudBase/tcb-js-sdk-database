export const sleep = (ms: number = 0) => new Promise(r => setTimeout(r, ms))

const counters: Record<string, number> = {}

export const autoCount = (domain: string = 'any'): number => {
  if (!counters[domain]) {
    counters[domain] = 0
  }
  return counters[domain]++
}

export class TcbError extends Error {
  readonly code: string
  readonly message: string
  constructor(error: IErrorInfo) {
    super(error.message)
    this.code = error.code
    this.message = error.message
  }
}

export const E = (errObj: IErrorInfo) => {
  return new TcbError(errObj)
}

interface IErrorInfo {
  code?: string
  message?: string
}
