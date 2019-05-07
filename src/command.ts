import { QueryCommand, QUERY_COMMANDS_LITERAL } from './commands/query'
import { LogicCommand, LOGIC_COMMANDS_LITERAL } from './commands/logic'
import { UpdateCommand, UPDATE_COMMANDS_LITERAL } from './commands/update'
import { isArray } from './utils/type'



export type IQueryCondition = Record<string, any> | LogicCommand

export const Command = {

  eq(val: any) {
    return new QueryCommand(QUERY_COMMANDS_LITERAL.EQ, [val])
  },

  neq(val: any) {
    return new QueryCommand(QUERY_COMMANDS_LITERAL.NEQ, [val])
  },

  lt(val: any) {
    return new QueryCommand(QUERY_COMMANDS_LITERAL.LT, [val])
  },

  lte(val: any) {
    return new QueryCommand(QUERY_COMMANDS_LITERAL.LTE, [val])
  },

  gt(val: any) {
    return new QueryCommand(QUERY_COMMANDS_LITERAL.GT, [val])
  },

  gte(val: any) {
    return new QueryCommand(QUERY_COMMANDS_LITERAL.GTE, [val])
  },

  in(val: any) {
    return new QueryCommand(QUERY_COMMANDS_LITERAL.IN, val)
  },

  nin(val: any) {
    return new QueryCommand(QUERY_COMMANDS_LITERAL.NIN, val)
  },

  geoNear(val: any) {
    return new QueryCommand(QUERY_COMMANDS_LITERAL.GEO_NEAR, [val])
  },

  geoWithin(val: any) {
    return new QueryCommand(QUERY_COMMANDS_LITERAL.GEO_WITHIN, [val])
  },

  geoIntersects(val: any) {
    return new QueryCommand(QUERY_COMMANDS_LITERAL.GEO_INTERSECTS, [val])
  },

  and(...__expressions__: IQueryCondition[]) {
    const expressions = isArray(arguments[0]) ? arguments[0] : Array.from(arguments)
    return new LogicCommand(LOGIC_COMMANDS_LITERAL.AND, expressions)
  },

  or(...__expressions__: IQueryCondition[]) {
    const expressions = isArray(arguments[0]) ? arguments[0] : Array.from(arguments)
    return new LogicCommand(LOGIC_COMMANDS_LITERAL.OR, expressions)
  },

  set(val: any) {
    return new UpdateCommand(UPDATE_COMMANDS_LITERAL.SET, [val])
  },

  remove() {
    return new UpdateCommand(UPDATE_COMMANDS_LITERAL.REMOVE, [])
  },

  inc(val: number) {
    return new UpdateCommand(UPDATE_COMMANDS_LITERAL.INC, [val])
  },

  mul(val: number) {
    return new UpdateCommand(UPDATE_COMMANDS_LITERAL.MUL, [val])
  },

  push(...__values__: any[]) {
    const values = isArray(arguments[0]) ? arguments[0] : Array.from(arguments)
    return new UpdateCommand(UPDATE_COMMANDS_LITERAL.PUSH, values)
  },

  pop() {
    return new UpdateCommand(UPDATE_COMMANDS_LITERAL.POP, [])
  },

  shift() {
    return new UpdateCommand(UPDATE_COMMANDS_LITERAL.SHIFT, [])
  },

  unshift(...__values__: any[]) {
    const values = isArray(arguments[0]) ? arguments[0] : Array.from(arguments)
    return new UpdateCommand(UPDATE_COMMANDS_LITERAL.UNSHIFT, values)
  },

  aggregate: {}
}


const pipelineOperators = [
  // https://docs.mongodb.com/manual/reference/operator/aggregation/
  // 算数操作符
  'abs',
  'add',
  'ceil',
  'divide',
  'exp',
  'floor',
  'ln',
  'log',
  'log10',
  'mod',
  'multiply',
  'pow',
  'sqrt',
  'subtract',
  'trunc',

  // 数组操作符
  'arrayElemAt',
  'arrayToObject',
  'concatArrays',
  'filter',
  'in',
  'indexOfArray',
  'isArray',
  'map',
  'objectToArray',
  'range',
  'reduce',
  'reverseArray',
  'size',
  'slice',
  'zip',

  //布尔操作符
  'and',
  'not',
  'or',

  // 比较操作符
  'cmp',
  'eq',
  'gt',
  'gte',
  'lt',
  'lte',
  'ne', // neq?

  // 条件操作符
  'cond',
  'ifNull',
  'switch',

  // 日期操作符
  'dayOfWeek',
  'dateFromParts',
  'dateFromString',
  'dayOfMonth',
  'dayOfWeek',
  'dayOfYear',
  'isoDayOfWeek',
  'isoWeek',
  'isoWeekYear',
  'millisecond',
  'minute',
  'month',
  'second',
  // 'toDate', 4.0才有
  'week',
  'year',

  // 字面操作符
  'literal',

  // 对象操作符
  'mergeObjects',
  'objectToArray',

  // 集合操作符
  'allElementsTrue',
  'anyElementTrue',
  'setDifference',
  'setEquals',
  'setIntersection',
  'setIsSubset',
  'setUnion',

  // 字符串操作符
  'concat',
  'dataToString',
  'indexOfBytes',
  'indexOfCP',
  // 'ltrim',
  // 'rtrim',
  'split',
  'strLenBytes',
  'strLenCP',
  'strcasecmp',
  'substr',
  'substrBytes',
  'substrCP',
  'toLower',
  // 'toString'
  // 'trim'
  'toUpper',

  // 文本操作符
  'meta',

  // group操作符
  'addToSet',
  'avg',
  'first',
  'last',
  'max',
  'min',
  'push',
  'stdDevPop',
  'stdDevSamp',

  // 变量声明操作符
  'let'
]
pipelineOperators.forEach(op => {
  Command.aggregate[op] = function(param) {
    return {
      [`$${op}`]: param
    }
  }
})

export default Command

