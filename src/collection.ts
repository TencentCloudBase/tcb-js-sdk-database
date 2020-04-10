import { Db } from './index'
import { DocumentReference } from './document'
import { Query, QueryOption, UpdateOption } from './query'
import Aggregation from './aggregate'
import { serialize } from './serializer/datatype'
import { E, getReqOpts, stringifyByEJSON } from './utils/utils'
import { Validate } from './validate'
import { isArray } from './utils/type'

// import { EJSON } from 'bson'

/**
 *
 * 集合模块，继承 Query 模块
 *
 * @author haroldhu
 */
export class CollectionReference extends Query {
  private _transactionId: string
  /**
   * 初始化
   *
   * @internal
   *
   * @param db    - 数据库的引用
   * @param coll  - 集合名称
   */
  /* eslint-disable no-useless-constructor */
  constructor(
    db: Db,
    coll: string,
    apiOptions?: QueryOption | UpdateOption,
    transactionId?: string
  ) {
    super(db, coll, '', apiOptions)
    if (transactionId) {
      this._transactionId = transactionId
    }
  }

  /**
   * 读取集合名字
   */
  get name() {
    return this._coll
  }

  /**
   * 获取文档的引用
   *
   * @param docID - 文档ID
   */
  doc(docID: string | number): DocumentReference {
    if (typeof docID !== 'string' && typeof docID !== 'number') {
      throw new Error('docId必须为字符串或数字')
    }
    return new DocumentReference(this._db, this._coll, this._apiOptions, docID, this._transactionId)
  }

  /**
   * 添加一篇文档
   *
   * @param data  - 数据
   * @param opts  - 可选配置项
   */
  async add(
    data: any[]
  ): Promise<{
    insertedIds: string[]
    requestId: string
  }> {
    // 判断data是否为数组
    if (!isArray(data)) {
      data = [data]
    }

    const transformData = data.map(item => {
      return stringifyByEJSON(serialize(item))
    })
    let params = {
      collectionName: this._coll,
      data: transformData
    }

    // console.log('params:', params)

    const res = await this._request.send(
      'database.insertDocument',
      params,
      getReqOpts(this._apiOptions)
    )

    if (res.code) {
      throw E({ ...res })
    } else {
      return {
        insertedIds: res.data.insertedIds,
        requestId: res.requestId
      }
    }
  }

  aggregate() {
    return new Aggregation(this._db, this._coll)
  }

  /**
   * 设置请求操作项
   *
   * @param {(QueryOption | UpdateOption)} apiOptions
   * @memberof Query
   */
  public options(apiOptions: QueryOption | UpdateOption) {
    // 校验字段是否合规
    Validate.isRightOptions(apiOptions)
    return new CollectionReference(this._db, this._coll, apiOptions, this._transactionId)
  }
}
