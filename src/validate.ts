import {
  ErrorCode,
  WhereFilterOp,
  WhereFilterOpList,
  OrderByDirection,
  OrderDirectionList,
  FieldType
} from './constant'
import { Util } from './util'
import { QueryOption, UpdateOption } from './query'
import { ERRORS } from './const/code'
import { E } from './utils/utils'
import { getType } from './utils/type'

const validOptionsKeys = ['limit', 'offset', 'projection', 'order', 'multiple', 'timeout']

/**
 * 校验模块
 *
 * @author haroldhu
 * @internal
 * multi, upsert, merge
 */
export class Validate {
  /**
   * 检测地址位置的点
   *
   * @param point   - 经纬度
   * @param degree  - 数值
   */
  static isGeopoint(point: 'latitude' | 'longitude', degree: number) {
    if (Util.whichType(degree) !== FieldType.Number) {
      throw new Error('Geo Point must be number type')
    }

    // 位置的绝对值
    const degreeAbs = Math.abs(degree)

    if (point === 'latitude' && degreeAbs > 90) {
      throw new Error('latitude should be a number ranges from -90 to 90')
    } else if (point === 'longitude' && degreeAbs > 180) {
      throw new Error('longitude should be a number ranges from -180 to 180')
    }
    return true
  }

  /**
   * 参数是否为整数
   *
   * @param param - 要验证的参数名
   * @param num   - 要验证的参数值
   */
  static isInteger(param: string, num: number): Boolean {
    if (!Number.isInteger(num)) {
      throw new Error(param + ErrorCode.IntergerError)
    }
    return true
  }

  /**
   * 参数是否为bool
   *
   * @param param - 要验证的参数名
   * @param num   - 要验证的参数值
   */
  static mustBeBoolean(param: string, bool: boolean): Boolean {
    if (typeof bool !== 'boolean') {
      throw new Error(param + ErrorCode.BooleanError)
    }
    return true
  }

  static isProjection(param: string, value: object): Boolean {
    // 遍历value 的 属性值， 只有1，0，ProjectionOperator 三种类型
    if (getType(value) !== 'object') {
      throw E({ ...ERRORS.INVALID_PARAM, message: `${param} projection must be an object` })
    }

    for (const key in value) {
      const subValue = value[key]
      if (getType(subValue) === 'number') {
        if (subValue !== 0 && subValue !== 1) {
          throw E({
            ...ERRORS.INVALID_PARAM,
            message: `if the value in projection is of number, it must be 0 or 1`
          })
        }
      } else if (getType(subValue) === 'object') {
      } else {
        throw E({
          ...ERRORS.INVALID_PARAM,
          message: 'invalid projection'
        })
      }
    }

    return true
  }

  static isOrder(param: string, value: Record<string, any>): Boolean {
    if (getType(value) !== 'object') {
      throw E({ ...ERRORS.INVALID_PARAM, message: `${param} order must be an object` })
    }

    for (let key in value) {
      const subValue = value[key]
      if (subValue !== 1 && subValue !== -1) {
        throw E({
          ...ERRORS.INVALID_PARAM,
          message: `order value must be 1 or -1`
        })
      }
    }
    return true
  }

  /**
   * 是否为合法的排序字符
   *
   * @param direction
   */
  static isFieldOrder(direction: OrderByDirection): Boolean {
    if (OrderDirectionList.indexOf(direction) === -1) {
      throw new Error(ErrorCode.DirectionError)
    }
    return true
  }

  /**
   * 是否为合法的字段地址
   *
   * 只能是连续字段名+英文点号
   *
   * @param path
   */
  static isFieldPath(path: string): Boolean {
    if (!/^[a-zA-Z0-9-_\.]/.test(path)) {
      throw new Error()
    }
    return true
  }

  /**
   * 是否为合法操作符
   *
   * @param op
   */
  static isOperator(op: WhereFilterOp): Boolean {
    if (WhereFilterOpList.indexOf(op) === -1) {
      throw new Error(ErrorCode.OpStrError)
    }
    return true
  }

  /**
   * 集合名称是否正确
   *
   * 只能以数字字母开头
   * 可以包含字母数字、减号、下划线
   * 最大长度32位
   *
   * @param name
   */
  static isCollName(name: string): Boolean {
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-_]){1,32}$/.test(name)) {
      throw new Error(ErrorCode.CollNameError)
    }
    return true
  }

  /**
   * DocID 格式是否正确
   *
   * @param docId
   */
  static isDocID(docId: string): Boolean {
    if (!/^([a-fA-F0-9]){24}$/.test(docId)) {
      throw new Error(ErrorCode.DocIDError)
    }
    return true
  }

  /**
   * 校验apiOption结构
   *
   * @static
   * @param {(QueryOption | UpdateOption)} options
   * multi, upsert, merge
   * @returns {Boolean}
   * @memberof Validate
   */
  static isValidOptions(options: QueryOption | UpdateOption = {}): Boolean {
    if (getType(options) !== 'object') {
      throw E({ ...ERRORS.INVALID_PARAM, message: `options must be an object` })
    }

    const keys = Object.keys(options)
    for (const index in keys) {
      if (validOptionsKeys.indexOf(keys[index]) < 0) {
        throw E({ ...ERRORS.INVALID_PARAM, message: `${keys[index]} is invalid options key` })
      }
    }

    const { limit, offset, projection, order } = options as QueryOption
    const { multiple } = options as UpdateOption
    if (limit !== undefined) {
      Validate.isInteger('limit', limit)
    }
    if (offset !== undefined) {
      Validate.isInteger('offset', offset)
    }
    if (projection !== undefined) {
      Validate.isProjection('projection', projection)
    }
    if (order !== undefined) {
      Validate.isOrder('order', order)
    }
    if (multiple !== undefined) {
      Validate.mustBeBoolean('multiple', multiple)
    }
    if (options.timeout !== undefined) {
      Validate.isInteger('timeout', options.timeout)
    }
    return true
  }
}
