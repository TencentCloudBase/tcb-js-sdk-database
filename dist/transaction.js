"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bson_1 = require("bson");
const db_1 = require("./db");
class DocumentSnapshot {
    constructor(data, requestId) {
        this._data = data;
        this.requestId = requestId;
    }
    data() {
        return this._data;
    }
}
class Transaction {
    constructor(db) {
        this._db = db;
        this._request = new db_1.Db.reqClass(this._db.config);
    }
    async init() {
        const res = await this._request.send('database.startTransaction');
        if (res.code) {
            throw res;
        }
        this._id = res.transactionId;
    }
    async get(documentRef) {
        const param = {
            collectionName: documentRef._coll,
            transactionId: this._id,
            _id: documentRef.id
        };
        const res = await this._request.send('database.getInTransaction', param);
        if (res.code)
            throw res;
        return new DocumentSnapshot(bson_1.EJSON.parse(res.data), res.requestId);
    }
    async set(documentRef, data) {
        const param = {
            collectionName: documentRef._coll,
            transactionId: this._id,
            _id: documentRef.id,
            data: bson_1.EJSON.stringify(data, { relaxed: false }),
            upsert: true
        };
        const res = await this._request.send('database.updateDocInTransaction', param);
        if (res.code)
            throw res;
        return Object.assign({}, res, { updated: bson_1.EJSON.parse(res.updated), upserted: res.upserted ? JSON.parse(res.upserted) : null });
    }
    async update(documentRef, data) {
        const param = {
            collectionName: documentRef._coll,
            transactionId: this._id,
            _id: documentRef.id,
            data: bson_1.EJSON.stringify({
                $set: data
            }, {
                relaxed: false
            })
        };
        const res = await this._request.send('database.updateDocInTransaction', param);
        if (res.code)
            throw res;
        return Object.assign({}, res, { updated: bson_1.EJSON.parse(res.updated) });
    }
    async delete(documentRef) {
        const param = {
            collectionName: documentRef._coll,
            transactionId: this._id,
            _id: documentRef.id
        };
        const res = await this._request.send('database.deleteDocInTransaction', param);
        if (res.code)
            throw res;
        return Object.assign({}, res, { deleted: bson_1.EJSON.parse(res.deleted) });
    }
    async commit() {
        const param = {
            transactionId: this._id
        };
        const res = await this._request.send('database.commitTransaction', param);
        if (res.code)
            throw res;
        return res;
    }
    async rollback() {
        const param = {
            transactionId: this._id
        };
        const res = await this._request.send('database.abortTransaction', param);
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
