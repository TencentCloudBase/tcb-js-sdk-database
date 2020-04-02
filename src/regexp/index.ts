import { SYMBOL_REGEXP } from '../helper/symbol'

export class RegExp {
  pattern: string
  options: string
  constructor({ regexp, options }) {
    if (!regexp) {
      throw new TypeError('regexp must be a string')
    }
    this.pattern = regexp
    this.options = options
  }

  parse() {
    return {
      $regularExpression: {
        pattern: this.pattern || '',
        options: this.options || ''
      }
    }
  }

  get _internalType() {
    return SYMBOL_REGEXP
  }
}

export function RegExpConstructor(param) {
  return new RegExp(param)
}
