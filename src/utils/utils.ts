import { QueryOption, UpdateOption } from '../query'
import { EJSON } from 'bson'

export const sleep = (ms: number = 0) => new Promise(r => setTimeout(r, ms))

const counters: Record<string, number> = {}

export const autoCount = (domain: string = 'any'): number => {
  if (!counters[domain]) {
    counters[domain] = 0
  }
  return counters[domain]++
}

export const getReqOpts = (apiOptions: QueryOption | UpdateOption): any => {
  // 影响底层request的暂时只有timeout
  if (apiOptions.timeout !== undefined) {
    return {
      timeout: apiOptions.timeout
    }
  }

  return {}
}

export const stringifyByEJSON = params => {
  return EJSON.stringify(params, { relaxed: false })
}

export const parseByEJSON = params => {
  return EJSON.parse(params)
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
