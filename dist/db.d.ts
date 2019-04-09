import { Point } from './geo/point';
import { CollectionReference } from './collection';
import { Command } from './command';
interface GeoTeyp {
    Point: typeof Point;
}
export declare class Db {
    static reqClass: any;
    Geo: GeoTeyp;
    command: typeof Command;
    RegExp: any;
    serverDate: any;
    config: any;
    constructor(config?: any);
    collection(collName: string): CollectionReference;
}
export {};
