import { DocumentReference } from './document';
import { Db } from './db';
declare class DocumentSnapshot {
    private _data;
    requestId: string;
    constructor(data: any, requestId: any);
    data(): any;
}
export declare class Transaction {
    private _id;
    private _db;
    private _request;
    constructor(db: Db);
    init(): Promise<void>;
    get(documentRef: DocumentReference): Promise<DocumentSnapshot>;
    set(documentRef: DocumentReference, data: Object): Promise<SetResult>;
    update(documentRef: DocumentReference, data: Object): Promise<UpdateResult>;
    delete(documentRef: DocumentReference): Promise<DeleteResult>;
    commit(): Promise<CommitResult>;
    rollback(): Promise<RollbackResult>;
}
export declare function startTransaction(): Promise<Transaction>;
export declare function runTransaction(callback: (transaction: Transaction) => void | Promise<any>, times?: number): Promise<void>;
interface CommitResult {
    requestId: string;
    data: object;
}
interface RollbackResult {
    requestId: string;
}
interface UpdateResult {
    requestId: string;
    updated: number | string;
}
interface SetResult extends UpdateResult {
    upserted: number | string;
}
interface DeleteResult {
    requestId: string;
    deleted: number | string;
}
export {};
