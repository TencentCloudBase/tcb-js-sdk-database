// var WebSocket = require("ws");

// function cerateclient() {
//   var ws = new WebSocket("ws://localhost:8001/");
//   ws.onopen = function() {
//     ws.send("connnect");
//   };

//   ws.onmessage = function(evt) {
//     console.log(evt.data);
//   };

//   ws.onerror = function(err) {
//     console.log(err);
//   };
// }

// for (var i = 0; i < 20000; i++) {
//   cerateclient();
// }

/**
 * websocket client demo
 *
 */

// const args = process.argv.slice(2);
const WebSocket = require("ws");
// const uuidv1 = require("uuid/v1");
const NodeCache = require("node-cache");
const ERRORS = require("../const/code").ERRORS;
const queueMsgCache = new NodeCache();
// const queueMsgCache = lscache;

/**
 *
 *
 * @class WSClient websocket客户端类
 */
class WSClient {
  constructor({
    pingTimeout,
    pongTimeout,
    reconnectTimeout,
    wsURL,
    params,
    callbackObj
  }) {
    this.opts = {
      wsURL,
      pingTimeout,
      pongTimeout,
      reconnectTimeout
    };

    this.ws = null;
    this.queueMsgCache = queueMsgCache;
    this.params = params;
    this.queryID = null; // 当前连接的queryID
    this.reconnectTimes = 0; // 重连次数设为0
    this.callbackObj = callbackObj;
  }

  /**
   * 创建websocket连接
   *
   * @param {*} reconnFlag
   * @memberof WSClient
   */
  createWsCon(reconnFlag) {
    // reconnFlag 为false 初始建立连接 true 重新建立连接
    // if (this.ws) { //
    //   return;
    // }
    try {
      this.ws = new WebSocket(this.opts.wsURL);
      this.initEventHandle(reconnFlag);
    } catch (e) {
      // this.reconnect();
      // 创建连接异常，不重试，抛出对应错误码 todo
      console.log("create error catch*********");
      throw e;
    }
  }

  /**
   * 构造消息
   *
   * @param {*} { msgType, msgData }
   * @returns
   * @memberof WSClient
   */
  createMsg({ msgType, msgData }) {
    const msg = {
      msgType, // 发送消息类型分为1. initWatchMsg 初始建立连接msg 2. reconnectMsg 重新建立连接msg(需要传缓存中的eventID)
      msgData
    };
    return msg;
  }

  /**
   * 检查当前ws是否为open状态
   *
   * @returns
   * @memberof WSClient
   */
  checkWSOpen() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // 非open态
      return false;
    }
    return true;
  }

  /**
   * 发送消息
   *
   * @param {*} msg
   * @param {*} callback
   * @param {*} timeout
   * @returns
   * @memberof WSClient
   */
  send(msg, callback, timeout) {
    if (!this.checkWSOpen()) {
      // 非open状态 表明建立ws连接后中途断开 进入重连逻辑
      this.reconnect();
      return;
    }

    // todo 是否不用考虑send超时
    let timer;
    this.ws.send(msg, err => {
      clearTimeout(timer);
      if (err) {
        // 发送连接消息报错，抛异常
        // todo
        console.log("socket write err************");
        throw err;
      }
      callback();
    });

    timer = setTimeout(() => {
      // todo 超时逻辑 抛异常
      throw new Error(ERRORS.CONN_ERROR);
    }, timeout); // 3000 todo 建立连接超时时间设定
  }

  /**
   * 监听连接事件
   *
   * @param {*} reconnFlag
   * @memberof WSClient
   */
  initEventHandle(reconnFlag) {
    console.log("connect starting....");

    this.ws.on("upgrade", res => {
      console.log("upgrade res******");
      // console.log(res);
      // todo upgrade失败则报错
    });

    // this.ws.addEventListener("open", res => {
    this.ws.on("open", res => {
      // todo 需要区分初始连接与重连两种情况，初始连接不用传eventID，重连需要传缓存中queryID下的最新eventID
      // 重连次数重置为0
      this.reconnectTimes = 0;
      // 心跳重置
      this.heart();
      console.log("connect open....");

      let msg = null;
      if (reconnFlag) {
        // 重连时取queryID对应信息
        let queryIdCache = this.queueMsgCache.get(this.queryID);
        let { cacheCurrEvent } = queryIdCache;

        msg = this.createMsg({
          // msgId,
          msgType: "reconnectMsg",
          msgData: {
            QueryID: this.queryID,
            EventID: cacheCurrEvent,
            Uin: this.params.Uin,
            RequestId: this.params.RequestId
          }
        });
      } else {
        msg = this.createMsg({
          // msgId,
          msgType: "initWatchMsg",
          msgData: this.params
        });

        console.log('client send initWatchMsg:', msg)
      }

      // 初始建立连接，超时则报错; 重新建立连接，todo
      this.send(
        JSON.stringify(msg),
        () => {
          console.log("send initWatchMsg success");
        },
        3000
      );
    });

    // this.ws.addEventListener("message", msg => {
    this.ws.on("message", msg => {
      // client收到msg type 1. eventMsg 从ws服务返回event数据 2. 从ws服务返回的后台错误信息
      // 心跳重置
      this.heart();
      // console.log("client receive message:", msg);
      let msgObj = JSON.parse(msg);

      if (msgObj.msgType === "initEventMsg") {
        // 初始watch的存量event
        let { msgData } = msgObj;
        let { queryID, currEvent, events } = msgData;
        console.log(
          `收到eventMsgType:${msgObj.msgType}--对应event数据:`,
          msgData
        );

        if (this.queryID === null) {
          this.queryID = queryID;
        }

        if (this.queueMsgCache.get(queryID)) {
          // 删除之前的缓存
          this.queueMsgCache.del(queryID);
        }

        // 存量数据设置 连接断开3min后清除当前queryID对应缓存数据 todo
        this.queueMsgCache.set(queryID, {
          cacheEventList: events, // 存量数据
          // cacheEventList: events.concat(), // 所有数据
          cacheCurrEvent: currEvent // 最新eventID
        });

        // 将存量数据传给用户
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
        //
        let { msgData } = msgObj;
        let { queryID, currEvent, events } = msgData;
        console.log(
          `收到eventMsgType:${msgObj.msgType}--对应event数据:`,
          msgData
        );

        if (this.queryID !== queryID) {
          throw new Error("缓存状态错误 queryID not match");
        }

        let queryIdCache = this.queueMsgCache.get(queryID);

        if (!queryIdCache) {
          // 删除之前的缓存
          throw new Error("缓存状态错误 queryID no cache");
        }

        // 去重，检查有序
        let { cacheEventList, cacheCurrEvent } = queryIdCache;
        if (cacheCurrEvent + 1 < events[0].ID) {
          // 收到的第一个event 不是 当前缓存event后的一个，网络异常导致消息丢失
          // 进行重连 todo
          console.log("网路异常，event丢失，尝试重连");
          this.reconnect();
        } else {
          // 取events中处于缓存currEvent之后的数据
          let filterEvents = events.filter(event => event.ID > cacheCurrEvent);

          // 将event数据传给回调
          let docChanges = [];

          // 更新本地缓存
          filterEvents.forEach(item => {
            // 判断收到的events datatype 类型(insert update remove)
            if (item.DataType === "insert") {
              // 新增数据
              cacheEventList.push(item);
              // 传给用户
              docChanges.push({
                QueueType: item.QueueType,
                DataType: item.DataType,
                data: item.Doc
              });
            }

            if (item.DataType === "remove" || item.DataType === "update") {
              // 找到docID一致的event
              let foundIndex = cacheEventList.findIndex(cacheItem => {
                return cacheItem.DocID === item.DocID;
              });

              if (foundIndex < 0) {
                // 本地缓存找不到对应的docID 缓存状态问题
                console.log(
                  "缓存数据与收到event无法对应，重新建立连接拉取数据"
                ); // todo
              }

              // 删除则从本地缓存移除
              if (item.DataType === "remove") {
                // 传给用户
                docChanges.push({
                  QueueType: cacheEventList[foundIndex].QueueType,
                  DataType: cacheEventList[foundIndex].DataType,
                  data: cacheEventList[foundIndex].Doc
                });
                // 缓存删除当前doc
                cacheEventList.splice(foundIndex, 1);
              }
              // 传给用户
              docChanges.push({
                QueueType: item.QueueType,
                DataType: item.DataType,
                data: item.Doc
              });

              // 更新则直接给doc字段赋新值
              cacheEventList[foundIndex]["Doc"] = item["Doc"];
            }
          });

          // 更新当前queryID对应缓存
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
        // 后台错误信息直接抛出，不走重连逻辑  中间层服务错误则不回发，保持ws连接存活
        throw new Error(msgObj.msgData.errorMsg);
      }
    });

    // this.ws.addEventListener("error", err => {
    this.ws.on("error", err => {
      // 连接异常，检查是否进入重连逻辑
      console.log("client receive error:", err);
      if (reconnFlag) {
        this.reconnect();
      } else {
        this.close();
      }
    });

    // this.ws.addEventListener("close", (code, reason) => {
    this.ws.on("close", (code, reason) => {
      // 连接断开，检查是否进入重连逻辑
      console.log("close code: ", code);
      console.log("close reason: ", reason);
      if (reconnFlag) {
        this.reconnect();
      }
      // todo delete this.ws?
    });

    this.ws.on("pong", () => {
      console.log("client receive pong");
      //心跳重置
      this.heart();
    });
  }

  /**
   *
   * 重连逻辑 重连进行3次，每次间隔15s，3次后仍失败则抛出连接中断错
   * @memberof WSClient
   */
  reconnect() {
    delete this.ws;
    this.ws = null;
    this.cleanHeart();
    // 重连时重连次数+1，如果>3则放弃重连，抛出连接中断错误
    if (++this.reconnectTimes > 3) {
      throw new Error(ERRORS.CREATE_WATCH_NET_ERROR);
    } else {
      console.log("断线重连次数:", this.reconnectTimes);
      if (this.reconnectTimes === 1) {
        // 第一次重连直接进行
        this.createWsCon(true);
      } else {
        // 之后的重连间隔15s进行
        setTimeout(() => {
          this.createWsCon(true);
        }, this.opts.reconnectTimeout);
      }
    }
  }

  /**
   * 清除心跳包timer
   *
   * @memberof WSClient
   */
  cleanHeart() {
    clearTimeout(this.pingTimeoutId);
    clearTimeout(this.pongTimeoutId);
  }

  /**
   * 设置心跳
   *
   * @memberof WSClient
   */
  heart() {
    this.cleanHeart();
    let { pingTimeout, pongTimeout } = this.opts;
    // 连接open或收到msg时, 间隔pingTimeout发送ping，并检测pongtimeout后能否收到pong(收到则重置，否则断开重连)
    this.pingTimeoutId = setTimeout(() => {
      this.ping();
      this.pongTimeoutId = setTimeout(() => {
        this.close();
      }, pongTimeout);
    }, pingTimeout);
  }

  /**
   * 发送ping
   *
   * @returns
   * @memberof WSClient
   */
  ping() {
    if (!this.checkWSOpen()) {
      // 连接已断开
      this.reconnect();
      return;
    }
    this.ws.ping();
  }

  /**
   * 关闭当前ws连接
   *
   * @memberof WSClient
   */
  close() {
    this.ws.close();
  }
}

// window.WSClient = WSClient;

// 模拟1000个ws连接
// let i = 0;
// while (i++ < 1) {
//   let wsIns = new WSClient({
//     pingTimeout: 10000,
//     pongTimeout: 5000,
//     reconnectTimeout: 15000,
//     wsURL: "ws://localhost:3000",
//     params: {
//       DBName: "tnt-61yk7lv8e",
//       CollName: "coll",
//       Query: `{"k": 2}`,
//       Uin: "xxx",
//       RequestId: "123456"
//     }
//   });

//   wsIns.createWsCon(false);
// }

exports.WSClient = WSClient;
