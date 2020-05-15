/* eslint-disable no-unused-vars */
import { OrderByDirection, QueryType } from './constant'
import { Db } from './index'
import { Validate } from './validate'
import { Util } from './util'
// import { Command } from './command';
// import * as isRegExp from 'is-regex'
import { QuerySerializer } from './serializer/query'
import { UpdateSerializer } from './serializer/update'
// import { WSClient } from "./websocket/wsclient"
import { IWatchOptions, DBRealtimeListener } from './typings/index'
import { RealtimeWebSocketClient } from './realtime/websocket-client'
import { ErrorCode } from './constant'
import {
  getReqOpts,
  stringifyByEJSON,
  preProcess,
  processReturn,
  transformDbObjFromNewToOld
} from './utils/utils'
import { ERRORS } from './const/code'
import { EJSON } from 'bson'

interface GetRes {
  data: any[]
  requestId: string
  total: number
  limit: number
  offset: number
}

// interface QueryOrder {
//   // field?: string
//   // direction?: 'asc' | 'desc'
//   key?: string
//   direction?: -1 | 1
// }

interface BaseOption {
  timeout?: number // 接口调用超时设置
}

export interface QueryOption extends BaseOption {
  // 查询数量
  limit?: number
  // 偏移量
  offset?: number
  // 指定显示或者不显示哪些字段
  projection?: Object
  // 结果排序
  order?: Record<string, any>[]
}

export interface UpdateOption extends BaseOption {
  // 是否只影响单条doc
  multiple?: boolean
  // // 是否插入
  // upsert?: boolean
  // // 是否replace
  // merge?: boolean
}

/**
 * 查询模块
 *
 * @author haroldhu
 */
export class Query {
  /**
   * Db 的引用
   *
   * @internal
   */
  protected _db: Db

  /**
   * Collection name
   *
   * @internal
   */
  protected _coll: string

  /**
   * 过滤条件
   *
   * @internal
   */
  private _fieldFilters: string

  // /**
  //  * 排序条件
  //  *
  //  * @internal
  //  */
  // private _fieldOrders: QueryOrder[]

  // /**
  //  * 查询条件
  //  *
  //  * @internal
  //  */
  // private _queryOptions: QueryOption

  /**
   * 统一条件项
   *
   * @private
   * @type {(QueryOption | UpdateOption)}
   * @memberof Query
   */
  public _apiOptions: QueryOption | UpdateOption

  /**
   * 请求实例
   *
   * @internal
   */
  public _request: any

  protected _oldInstance: any

  /**
   * websocket 参数 pingTimeout
   */
  // private _pingTimeout: number

  /**
   * websocket 参数 pongTimeout
   */
  // private _pongTimeout: number

  /**
   * websocket 参数 reconnectTimeout
   */
  // private _reconnectTimeout: number

  /**
   * websocket 参数 wsURL
   */
  // private _wsURL: string

  /**
   * 初始化
   *
   * @internal
   *
   * @param db            - 数据库的引用
   * @param coll          - 集合名称
   * @param fieldFilters  - 过滤条件
   * @param fieldOrders   - 排序条件
   * @param queryOptions  - 查询条件
   */
  public constructor(
    db: Db,
    coll: string,
    fieldFilters?: string,
    // fieldOrders?: QueryOrder[],
    // queryOptions?: QueryOption,
    apiOptions?: QueryOption | UpdateOption,
    _oldInstance?: any
    // rawWhereParams?: Object
  ) {
    this._db = db
    this._coll = coll
    this._fieldFilters = fieldFilters
    // this._fieldOrders = fieldOrders || []
    // this._queryOptions = queryOptions || {}
    this._apiOptions = apiOptions || {}
    /* eslint-disable new-cap */
    this._request = new Db.reqClass(this._db.config)
    // this._getAccessToken = Db.getAccessToken
    this._oldInstance = _oldInstance
  }

  /**
   * 发起请求获取文档列表
   *
   * - 默认获取集合下全部文档数据
   * - 可以把通过 `orderBy`、`where`、`skip`、`limit`设置的数据添加请求参数上
   */
  @preProcess()
  public async get(): Promise<GetRes> {
    /* eslint-disable no-param-reassign */
    // let newOrder = {}
    // if (this._fieldOrders) {
    //   this._fieldOrders.forEach(order => {
    //     newOder.push(order)
    //   })
    // }

    const order = (this._apiOptions as QueryOption).order

    // if (order) {
    //   order.forEach(item => {
    //     newOrder.push(item)
    //   })
    // }

    interface Param {
      collectionName: string
      query?: Object
      queryType: QueryType
      order?: string[]
      offset?: number
      limit?: number
      projection?: Object
    }
    let param: Param = {
      collectionName: this._coll,
      queryType: QueryType.WHERE
    }
    if (this._fieldFilters) {
      param.query = this._fieldFilters
    }
    if (order) {
      param.order = stringifyByEJSON(order)
    }
    // if (this._queryOptions.offset) {
    //   param.offset = this._queryOptions.offset
    // }

    const offset = (this._apiOptions as QueryOption).offset
    if (offset) {
      param.offset = offset
    }

    const limit = (this._apiOptions as QueryOption).limit

    // if (this._queryOptions.limit) {
    //   param.limit = this._queryOptions.limit < 1000 ? this._queryOptions.limit : 1000
    // } else {
    //   param.limit = 100
    // }
    if (limit) {
      param.limit = limit < 1000 ? limit : 1000
    } else {
      param.limit = 100
    }

    const projection = (this._apiOptions as QueryOption).projection
    // if (this._queryOptions.projection) {
    //   param.projection = this._queryOptions.projection
    // }

    if (projection) {
      param.projection = stringifyByEJSON(projection)
    }

    const res = await this._request.send(
      'database.getDocument',
      param,
      getReqOpts(this._apiOptions)
    )

    if (res.code) {
      return res
    }

    // if (res.code) {
    //   throw E({ ...res })
    // } else {
    const list = res.data.list.map(item => EJSON.parse(item))
    const documents = Util.formatResDocumentData(list)
    const result: any = {
      data: documents,
      requestId: res.requestId
    }
    if (res.limit) result.limit = res.limit
    if (res.offset) result.offset = res.offset
    return result
  }
  // }

  /**
   * 获取总数
   */
  @preProcess()
  public async count() {
    interface Param {
      collectionName: string
      query?: Object
      queryType: QueryType
    }
    let param: Param = {
      collectionName: this._coll,
      queryType: QueryType.WHERE
    }
    if (this._fieldFilters) {
      param.query = this._fieldFilters
    }
    const res = await this._request.send(
      'database.calculateDocument',
      param,
      getReqOpts(this._apiOptions)
    )

    if (res.code) {
      return res
    }

    // if (res.code) {
    //   throw E({ ...res })
    // } else {
    return {
      requestId: res.requestId,
      total: res.data.total
    }
    // }
  }

  /**
   * 查询条件
   *
   * @param query
   */
  public where(query: object) {
    // query校验 1. 必填对象类型  2. value 不可均为undefiend
    if (Object.prototype.toString.call(query).slice(8, -1) !== 'Object') {
      throw Error(ErrorCode.QueryParamTypeError)
    }

    const keys = Object.keys(query)

    const checkFlag = keys.some(item => {
      return query[item] !== undefined
    })

    if (keys.length && !checkFlag) {
      throw Error(ErrorCode.QueryParamValueError)
    }

    return new Query(
      this._db,
      this._coll,
      QuerySerializer.encodeEJSON(query),
      this._apiOptions,
      this._oldInstance.where(transformDbObjFromNewToOld(query, this._db._oldDbInstance, [query]))
      // this._fieldOrders,
      // this._queryOptions
    )
  }

  /**
   * 设置请求操作项
   *
   * @param {(QueryOption | UpdateOption)} apiOptions
   * @memberof Query
   */
  public options(apiOptions: QueryOption | UpdateOption) {
    // 校验字段是否合规
    Validate.isValidOptions(apiOptions)
    return new Query(this._db, this._coll, this._fieldFilters, apiOptions)
  }

  /**
   * 设置排序方式
   *
   * @param fieldPath     - 字段路径
   * @param directionStr  - 排序方式
   */
  public orderBy(fieldPath: string, directionStr: OrderByDirection): Query {
    Validate.isFieldPath(fieldPath)
    Validate.isFieldOrder(directionStr)

    const newOrder: Record<string, any> = {
      // key: fieldPath,
      // direction: directionStr === 'desc' ? -1 : 1
      [fieldPath]: directionStr === 'desc' ? -1 : 1
    }
    // const combinedOrders = this._fieldOrders.concat(newOrder)
    const order = (this._apiOptions as QueryOption).order || {}

    const newApiOption = Object.assign({}, this._apiOptions, {
      // order: order.concat(newOrder)
      order: Object.assign({}, order, newOrder)
    })

    return new Query(
      this._db,
      this._coll,
      this._fieldFilters,
      newApiOption,
      this._oldInstance.orderBy(fieldPath, directionStr)
    )
  }

  /**
   * 设置查询条数
   *
   * @param limit - 限制条数
   */
  public limit(limit: number): Query {
    Validate.isInteger('limit', limit)

    let newApiOption: QueryOption = { ...this._apiOptions }
    newApiOption.limit = limit

    return new Query(
      this._db,
      this._coll,
      this._fieldFilters,
      newApiOption,
      this._oldInstance.limit(limit)
    )
  }

  /**
   * 设置偏移量
   *
   * @param offset - 偏移量
   */
  public skip(offset: number): Query {
    Validate.isInteger('offset', offset)

    // let option = { ...this._queryOptions }
    let newApiOption: QueryOption = { ...this._apiOptions }

    newApiOption.offset = offset

    return new Query(
      this._db,
      this._coll,
      this._fieldFilters,
      newApiOption,
      this._oldInstance.skip(offset)
    )
  }

  /**
   * 发起请求批量更新文档
   *
   * @param data 数据
   */
  @preProcess()
  public async update(data: Object): Promise<any> {
    if (!data || typeof data !== 'object') {
      return processReturn(this._db.config.throwOnCode, {
        ...ERRORS.INVALID_PARAM,
        message: '参数必需是非空对象'
      })
    }

    if (data.hasOwnProperty('_id')) {
      return processReturn(this._db.config.throwOnCode, {
        ...ERRORS.INVALID_PARAM,
        message: '不能更新_id的值'
      })
    }

    let { multiple } = this._apiOptions as UpdateOption
    const multi = multiple === undefined ? true : multiple // where update 不传multi默认为true

    let param: any = {
      collectionName: this._coll,
      // query: this._fieldFilters,
      queryType: QueryType.WHERE,
      // query: QuerySerializer.encode(this._fieldFilters),
      multi,
      merge: true,
      upsert: false,
      data: UpdateSerializer.encodeEJSON(data)
    }

    if (this._fieldFilters) {
      param.query = this._fieldFilters
    }

    const res = await this._request.send(
      'database.modifyDocument',
      param,
      getReqOpts(this._apiOptions)
    )

    if (res.code) {
      return res
    }

    // if (res.code) {
    //   throw E({ ...res })
    // } else {
    return {
      requestId: res.requestId,
      updated: res.data.updated,
      upsertId: res.data.upsert_id
    }
    // }
  }

  /**
   * 指定要返回的字段
   * project 示例
   * 存在doc {a:1, b:2, c: [1,2,3,4], d: [{item: 1}, [item: 2]]}
   * 1. 指定返回doc中字段a,b,  projection设置为{a: true, b:true}
   * 2. 指定返回doc中数组字段c的 前1个元素  projection设置为{c: db.command.project.slice(1)}
   * 3. 指定返回doc中数组字段c的 第2,3个元素  projection设置为{c: db.command.project.slice([1,2])}
   * 4. 指定返回doc中数组字段d中的 满足属性值item大于1的第一个元素 projections设置为{c: db.command.project.elemMatch({item: db.command.gt(1)})}
   *
   * @param projection
   */
  public field(projection: any): Query {
    let transformProjection = {}
    for (let k in projection) {
      // 区分bool类型，number类型 和 Object类型
      if (typeof projection[k] === 'boolean') {
        transformProjection[k] = projection[k] === true ? 1 : 0
      }

      if (typeof projection[k] === 'number') {
        transformProjection[k] = projection[k] > 0 ? 1 : 0
      }

      if (typeof projection[k] === 'object') {
        transformProjection[k] = projection[k]
      }
    }

    let newApiOption: QueryOption = { ...this._apiOptions }
    newApiOption.projection = transformProjection

    return new Query(
      this._db,
      this._coll,
      this._fieldFilters,
      newApiOption,
      this._oldInstance.field(projection)
    )
  }

  /**
   * 条件删除文档
   */
  @preProcess()
  public async remove() {
    // if (Object.keys(this._queryOptions).length > 0) {
    //   console.warn('`offset`, `limit` and `projection` are not supported in remove() operation')
    // }
    // if (this._fieldOrders.length > 0) {
    //   console.warn('`orderBy` is not supported in remove() operation')
    // }

    const { offset, limit, projection, order } = this._apiOptions as QueryOption
    if (
      offset !== undefined ||
      limit !== undefined ||
      projection !== undefined ||
      order !== undefined
    ) {
      console.warn(
        '`offset`, `limit`, `projection`, `orderBy` are not supported in remove() operation'
      )
    }

    let { multiple } = this._apiOptions as UpdateOption
    const multi = multiple === undefined ? true : multiple // where remove 不传multi默认为true

    const param = {
      collectionName: this._coll,
      query: this._fieldFilters,
      queryType: QueryType.WHERE,
      multi
    }
    const res = await this._request.send(
      'database.removeDocument',
      param,
      getReqOpts(this._apiOptions)
    )

    if (res.code) {
      return res
    }
    // if (res.code) {
    //   throw E({ ...res })
    // } else {
    return {
      requestId: res.requestId,
      deleted: res.data.deleted
    }
    // }
  }

  /**
   * 监听query对应的doc变化
   */
  watch = (options: IWatchOptions): DBRealtimeListener => {
    if (!Db.ws) {
      Db.ws = new RealtimeWebSocketClient({
        context: {
          appConfig: {
            docSizeLimit: 1000,
            realtimePingInterval: 10000,
            realtimePongWaitTimeout: 5000,
            request: this._request
          }
        }
      })
    }

    const { limit, order } = this._apiOptions as QueryOption

    return (Db.ws as RealtimeWebSocketClient).watch({
      ...options,
      envId: this._db.config.env,
      collectionName: this._coll,
      query: JSON.stringify(this._fieldFilters), // 实时推送这里需要换成ejson协议，todo
      limit,
      orderBy: order
        ? order.reduce<Record<string, string>>((acc, cur) => {
            acc[cur.field] = cur.direction
            return acc
          }, {})
        : undefined
    })
  }
}
