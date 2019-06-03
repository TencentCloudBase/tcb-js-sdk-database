import { DocumentReference } from './document';
import { Db } from './db';
export declare class Transaction {
    private _id;
    private _db;
    private _request;
    constructor(db: Db);
    init(): Promise<void>;
    get(documentRef: DocumentReference): Promise<DocumentSnapshot>;
    commit(): Promise<CommitResult>;
}
export declare function startTransaction(): Promise<Transaction>;
export declare function runTransaction(callback: (transaction: Transaction) => void | Promise<any>, times?: number): Promise<void>;
interface DocumentSnapshot {
    requestId: string;
    data: Object | Array<any> | void;
}
interface CommitResult {
    requestId: string;
    data: object;
}
export {};
