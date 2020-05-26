import { Db } from './index'
import { Util } from './util'
import { UpdateSerializer } from './serializer/update'
import { serialize } from './serializer/datatype'
import { UpdateCommand } from './commands/update'
import { IWatchOptions, DBRealtimeListener } from './typings/index'
import { RealtimeWebSocketClient } from './realtime/websocket-client'
import { QueryType } from './constant'
import { getReqOpts, stringifyByEJSON, processReturn } from './utils/utils'
import { ERRORS } from './const/code'
import { EJSON } from 'bson'
import { QueryOption, UpdateOption } from './query'

/**
 * 文档模块
 *
 * @author haroldhu
 */
export class DocumentReference {
  /**
   * 文档ID
   */
  readonly id: string | number

  readonly _transactionId: string

  /**
   *
   */
  readonly projection: Object

  /**
   * 数据库引用
   *
   * @internal
   */
  private _db: Db

  /**
   * 集合名称
   *
   * @internal
   */
  readonly _coll: string

  /**
   * Request 实例
   *
   * @internal
   */
  private request: any

  private _apiOptions: QueryOption | UpdateOption

  /**
   * 初始化
   *
   * @internal
   *
   * @param db    - 数据库的引用
   * @param coll  - 集合名称
   * @param docID - 文档ID
   */
  constructor(
    db: Db,
    coll: string,
    apiOptions: QueryOption | UpdateOption,
    docID: string | number,
    transactionId: string
  ) {
    this._db = db
    this._coll = coll
    this.id = docID
    this._transactionId = transactionId
    /* eslint-disable new-cap*/
    this.request = new Db.reqClass(this._db.config)
    this._apiOptions = apiOptions
  }

  /**
   * 创建一篇文档
   *
   * @param data - 文档数据
   * @internal
   */
  async create(data: any): Promise<any> {
    // 存在docid 则放入data
    if (this.id) {
      data['_id'] = this.id
    }

    let params = {
      collectionName: this._coll,
      // data: Util.encodeDocumentDataForReq(data, false, false)
      data: [stringifyByEJSON(serialize(data))],
      transactionId: this._transactionId
    }

    const res = await this.request.send(
      'database.insertDocument',
      params,
      getReqOpts(this._apiOptions)
    )

    if (res.code) {
      return res
    }

    // 兼容原事务 插入文档接口
    if (this._transactionId) {
      return {
        inserted: 1,
        ok: 1,
        id: res.data.insertedIds[0],
        requestId: res.requestId
      }
    }

    return {
      id: res.data.insertedIds[0],
      requestId: res.requestId
    }
    // }
  }

  /**
   * 创建或添加数据
   *
   * 如果文档ID不存在，则创建该文档并插入数据，根据返回数据的 upserted_id 判断
   * 添加数据的话，根据返回数据的 set 判断影响的行数
   *
   * @param data - 文档数据
   * @param opts - 可选项
   */
  async set(data: Object): Promise<any> {
    if (!this.id) {
      return processReturn(this._db.config.throwOnCode, {
        ...ERRORS.INVALID_PARAM,
        message: 'docId不能为空'
      })
    }

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

    let hasOperator = false
    const checkMixed = objs => {
      if (typeof objs === 'object') {
        for (let key in objs) {
          if (objs[key] instanceof UpdateCommand) {
            hasOperator = true
          } else if (typeof objs[key] === 'object') {
            checkMixed(objs[key])
          }
        }
      }
    }
    checkMixed(data)

    if (hasOperator) {
      //不能包含操作符
      return processReturn(this._db.config.throwOnCode, {
        ...ERRORS.DATABASE_REQUEST_FAILED,
        message: 'update operator complicit'
      })
    }

    let param = {
      collectionName: this._coll,
      queryType: QueryType.DOC,
      data: stringifyByEJSON(serialize(data)),
      transactionId: this._transactionId,
      multi: false,
      merge: false, //data不能带有操作符
      upsert: true
    }

    if (this.id) {
      param['query'] = stringifyByEJSON({ _id: this.id })
    }

    const res: any = await this.request.send(
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
    // 兼容事务set 旧接口
    if (this._transactionId) {
      return {
        updated: res.data.updated,
        upserted: [{ _id: res.data.upsert_id }], // 成功插入的doc id
        requestId: res.requestId
      }
    }

    return {
      updated: res.data.updated,
      upsertedId: res.data.upsert_id,
      requestId: res.requestId
    }
    // }
  }

  /**
   * 更新数据
   *
   * @param data - 文档数据
   * @param opts - 可选项
   */
  async update(data: Object): Promise<any> {
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

    const query = stringifyByEJSON({ _id: this.id })
    const param = {
      collectionName: this._coll,
      transactionId: this._transactionId,
      data: UpdateSerializer.encodeEJSON(data),
      query,
      queryType: QueryType.DOC,
      multi: false,
      merge: true, //把所有更新数据转为带操作符的
      upsert: false
    }

    const res = await this.request.send(
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
      // matched: res.data.matched,
      updated: res.data.updated,
      requestId: res.requestId
    }
    // }
  }

  /**
   * 删除文档（事务兼容delete接口）
   */
  async delete(): Promise<any> {
    return this.remove()
  }

  /**
   * 删除文档
   */
  async remove(): Promise<any> {
    const query = stringifyByEJSON({ _id: this.id })
    const param = {
      collectionName: this._coll,
      transactionId: this._transactionId,
      query: query,
      queryType: QueryType.DOC,
      multi: false
    }

    const res = await this.request.send(
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
      deleted: res.data.deleted,
      requestId: res.requestId
    }
    // }
  }

  /**
   * 返回选中的文档（_id）
   */
  async get(): Promise<any> {
    const query = stringifyByEJSON({ _id: this.id })
    const { projection } = this._apiOptions as QueryOption
    const param: any = {
      collectionName: this._coll,
      query,
      transactionId: this._transactionId,
      queryType: QueryType.DOC,
      multi: false
    }

    if (projection) {
      param.projection = stringifyByEJSON(projection)
    }
    const res = await this.request.send('database.getDocument', param, getReqOpts(this._apiOptions))

    if (res.code) {
      return res
    }
    // if (res.code) {
    //   throw E({ ...res })
    // } else {
    const list = res.data.list.map(item => EJSON.parse(item))
    const documents = Util.formatResDocumentData(list)

    // 兼容事务查询文档旧接口
    if (this._transactionId) {
      return {
        data: documents[0] || null,
        requestId: res.requestId
      }
    }

    return {
      data: documents,
      requestId: res.requestId,
      offset: res.data.offset,
      limit: res.data.limit
    }
    // }
  }

  /**
   *
   */
  field(projection: Object): DocumentReference {
    let transformProjection = {}
    for (let k in projection) {
      // 区分bool类型 和 Object类型
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

    return new DocumentReference(this._db, this._coll, newApiOption, this.id, this._transactionId)
  }

  /**
   * 监听单个文档
   */
  watch = (options: IWatchOptions): DBRealtimeListener => {
    if (!Db.ws) {
      Db.ws = new RealtimeWebSocketClient({
        context: {
          appConfig: {
            docSizeLimit: 1000,
            realtimePingInterval: 10000,
            realtimePongWaitTimeout: 5000,
            request: this.request
          }
        }
      })
    }

    return (Db.ws as RealtimeWebSocketClient).watch({
      ...options,
      envId: this._db.config.env,
      collectionName: this._coll,
      query: JSON.stringify({
        // todo 改为EJSON
        _id: this.id
      })
    })
    // })
  }
}
