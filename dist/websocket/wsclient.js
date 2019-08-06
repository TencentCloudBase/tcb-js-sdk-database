const WebSocket = require("ws");
const NodeCache = require("node-cache");
const ERRORS = require("../const/code").ERRORS;
const queueMsgCache = new NodeCache();
class WSClient {
    constructor({ pingTimeout, pongTimeout, reconnectTimeout, wsURL, params, callbackObj }) {
        this.opts = {
            wsURL,
            pingTimeout,
            pongTimeout,
            reconnectTimeout
        };
        this.ws = null;
        this.queueMsgCache = queueMsgCache;
        this.params = params;
        this.queryID = null;
        this.reconnectTimes = 0;
        this.callbackObj = callbackObj;
    }
    createWsCon(reconnFlag) {
        try {
            this.ws = new WebSocket(this.opts.wsURL);
            this.initEventHandle(reconnFlag);
        }
        catch (e) {
            console.log("create error catch*********");
            throw e;
        }
    }
    createMsg({ msgType, msgData }) {
        const msg = {
            msgType,
            msgData
        };
        return msg;
    }
    checkWSOpen() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return false;
        }
        return true;
    }
    send(msg, callback, timeout) {
        if (!this.checkWSOpen()) {
            this.reconnect();
            return;
        }
        let timer;
        this.ws.send(msg, err => {
            clearTimeout(timer);
            if (err) {
                console.log("socket write err************");
                throw err;
            }
            callback();
        });
        timer = setTimeout(() => {
            throw new Error(ERRORS.CONN_ERROR);
        }, timeout);
    }
    initEventHandle(reconnFlag) {
        console.log("connect starting....");
        this.ws.on("upgrade", res => {
            console.log("upgrade res******");
        });
        this.ws.on("open", res => {
            this.reconnectTimes = 0;
            this.heart();
            console.log("connect open....");
            let msg = null;
            if (reconnFlag) {
                let queryIdCache = this.queueMsgCache.get(this.queryID);
                let { cacheCurrEvent } = queryIdCache;
                msg = this.createMsg({
                    msgType: "reconnectMsg",
                    msgData: {
                        QueryID: this.queryID,
                        EventID: cacheCurrEvent,
                        Uin: this.params.Uin,
                        RequestId: this.params.RequestId
                    }
                });
            }
            else {
                msg = this.createMsg({
                    msgType: "initWatchMsg",
                    msgData: this.params
                });
                console.log('client send initWatchMsg:', msg);
            }
            this.send(JSON.stringify(msg), () => {
                console.log("send initWatchMsg success");
            }, 3000);
        });
        this.ws.on("message", msg => {
            this.heart();
            let msgObj = JSON.parse(msg);
            if (msgObj.msgType === "initEventMsg") {
                let { msgData } = msgObj;
                let { queryID, currEvent, events } = msgData;
                console.log(`收到eventMsgType:${msgObj.msgType}--对应event数据:`, msgData);
                if (this.queryID === null) {
                    this.queryID = queryID;
                }
                if (this.queueMsgCache.get(queryID)) {
                    this.queueMsgCache.del(queryID);
                }
                this.queueMsgCache.set(queryID, {
                    cacheEventList: events,
                    cacheCurrEvent: currEvent
                });
                let docChanges = [];
                events.forEach(item => {
                    docChanges.push({
                        QueueType: item.QueueType,
                        DataType: item.DataType,
                        data: item.Doc
                    });
                });
                this.callbackObj.success({
                    docChanges: JSON.parse(JSON.stringify(docChanges))
                });
            }
            if (msgObj.msgType === "nextEventMsg") {
                let { msgData } = msgObj;
                let { queryID, currEvent, events } = msgData;
                console.log(`收到eventMsgType:${msgObj.msgType}--对应event数据:`, msgData);
                if (this.queryID !== queryID) {
                    throw new Error("缓存状态错误 queryID not match");
                }
                let queryIdCache = this.queueMsgCache.get(queryID);
                if (!queryIdCache) {
                    throw new Error("缓存状态错误 queryID no cache");
                }
                let { cacheEventList, cacheCurrEvent } = queryIdCache;
                if (cacheCurrEvent + 1 < events[0].ID) {
                    console.log("网路异常，event丢失，尝试重连");
                    this.reconnect();
                }
                else {
                    let filterEvents = events.filter(event => event.ID > cacheCurrEvent);
                    let docChanges = [];
                    filterEvents.forEach(item => {
                        if (item.DataType === "insert") {
                            cacheEventList.push(item);
                            docChanges.push({
                                QueueType: item.QueueType,
                                DataType: item.DataType,
                                data: item.Doc
                            });
                        }
                        if (item.DataType === "remove" || item.DataType === "update") {
                            let foundIndex = cacheEventList.findIndex(cacheItem => {
                                return cacheItem.DocID === item.DocID;
                            });
                            if (foundIndex < 0) {
                                console.log("缓存数据与收到event无法对应，重新建立连接拉取数据");
                            }
                            if (item.DataType === "remove") {
                                docChanges.push({
                                    QueueType: cacheEventList[foundIndex].QueueType,
                                    DataType: cacheEventList[foundIndex].DataType,
                                    data: cacheEventList[foundIndex].Doc
                                });
                                cacheEventList.splice(foundIndex, 1);
                            }
                            docChanges.push({
                                QueueType: item.QueueType,
                                DataType: item.DataType,
                                data: item.Doc
                            });
                            cacheEventList[foundIndex]["Doc"] = item["Doc"];
                        }
                    });
                    this.queueMsgCache.set(queryID, {
                        cacheEventList: cacheEventList,
                        cacheCurrEvent: currEvent
                    });
                    this.callbackObj.success({
                        docChanges: JSON.parse(JSON.stringify(docChanges))
                    });
                }
            }
            if (msgObj.msgType === "serverErrorMsg") {
                throw new Error(msgObj.msgData.errorMsg);
            }
        });
        this.ws.on("error", err => {
            console.log("client receive error:", err);
            if (reconnFlag) {
                this.reconnect();
            }
            else {
                this.close();
            }
        });
        this.ws.on("close", (code, reason) => {
            console.log("close code: ", code);
            console.log("close reason: ", reason);
            if (reconnFlag) {
                this.reconnect();
            }
        });
        this.ws.on("pong", () => {
            console.log("client receive pong");
            this.heart();
        });
    }
    reconnect() {
        delete this.ws;
        this.ws = null;
        this.cleanHeart();
        if (++this.reconnectTimes > 3) {
            throw new Error(ERRORS.CREATE_WATCH_NET_ERROR);
        }
        else {
            console.log("断线重连次数:", this.reconnectTimes);
            if (this.reconnectTimes === 1) {
                this.createWsCon(true);
            }
            else {
                setTimeout(() => {
                    this.createWsCon(true);
                }, this.opts.reconnectTimeout);
            }
        }
    }
    cleanHeart() {
        clearTimeout(this.pingTimeoutId);
        clearTimeout(this.pongTimeoutId);
    }
    heart() {
        this.cleanHeart();
        let { pingTimeout, pongTimeout } = this.opts;
        this.pingTimeoutId = setTimeout(() => {
            this.ping();
            this.pongTimeoutId = setTimeout(() => {
                this.close();
            }, pongTimeout);
        }, pingTimeout);
    }
    ping() {
        if (!this.checkWSOpen()) {
            this.reconnect();
            return;
        }
        this.ws.ping();
    }
    close() {
        this.ws.close();
    }
}
exports.WSClient = WSClient;
