import { DocumentReference } from './document' 
import { Db } from './db'

export class Transaction {

  private _id: string;

  private _db: Db;

  private _request: any;

  private _data: Object;

  public constructor(db: Db) {
    this._db = db
    this._request = new Db.reqClass(this._db.config)
  }

  async init(): Promise<void> {
    const { data } = await this._request.send('database.startTransaction')
    this._id = data.TransactionId
  }

  async get(documentRef: DocumentReference): Promise<DocumentSnapshot> {
    const param = {
      collectionName: documentRef._coll,
      transactionId: this._id,
      _id: documentRef.id
    }
    const res = await this._request.send('database.getInTransaction', param)
    // EJSON 
    const mgoReturn = JSON.parse(JSON.parse(res.data.MgoReturn[0])[0])
    this._data = mgoReturn.cursor.firstBatch[0]
    return {
      data: this._data,
      requestId: res.requestId
    }
  }

  // async set(documentRef: DocumentReference, data: Object): Promise<void> {

  // }

  // async update(documentRef: DocumentReference, data: Object): Promise<void> {
  // ejson
  // }

  // async delete(documentRef: DocumentReference): Promise<void> {

  // }

  async commit(): Promise<CommitResult> {
    const param = {
      transactionId: this._id
    }
    const res: CommitResult = await this._request.send('database.commitTransaction', param)
    return res
  }

  // async rollback(): Promise<any> {
  //   const param = {
  //     transactionId: this._id
  //   }
  //   const res = await this._request.send('database.abortTransaction', param)
  //   return res
  // }
}

export async function startTransaction(): Promise<Transaction> {
  const transaction = new Transaction(this)
  await transaction.init()
  return transaction
}

export async function runTransaction(
  callback: (transaction: Transaction) => void | Promise<any>,
  times: number = 3
): Promise<void> {
  if (times <= 0) {
    return
  }
  try {
    const transaction = new Transaction(this)
    await callback(transaction)
    await transaction.commit()
  } catch (error) {
    arguments.callee(callback, --times)
  }
}

interface DocumentSnapshot {
  requestId: string,
  data: Object | void
}

interface CommitResult {
  requestId: string,
  data: object
}