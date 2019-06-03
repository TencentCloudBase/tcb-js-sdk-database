"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
class Transaction {
    constructor(db) {
        this._db = db;
        this._request = new db_1.Db.reqClass(this._db.config);
    }
    async init() {
        const { data } = await this._request.send('database.startTransaction');
        this._id = data.TransactionId;
    }
    async get(documentRef) {
        const param = {
            collectionName: documentRef._coll,
            transactionId: this._id,
            _id: documentRef.id
        };
        const res = await this._request.send('database.getInTransaction', param);
        const mgoReturn = JSON.parse(JSON.parse(res.data.MgoReturn[0])[0]);
        this._data = mgoReturn.cursor.firstBatch[0];
        return {
            data: this._data,
            requestId: res.requestId
        };
    }
    async commit() {
        const param = {
            transactionId: this._id
        };
        const res = await this._request.send('database.commitTransaction', param);
        return res;
    }
}
exports.Transaction = Transaction;
async function startTransaction() {
    const transaction = new Transaction(this);
    await transaction.init();
    return transaction;
}
exports.startTransaction = startTransaction;
async function runTransaction(callback, times = 3) {
    if (times <= 0) {
        return;
    }
    try {
        const transaction = new Transaction(this);
        await callback(transaction);
        await transaction.commit();
    }
    catch (error) {
        arguments.callee(callback, --times);
    }
}
exports.runTransaction = runTransaction;
