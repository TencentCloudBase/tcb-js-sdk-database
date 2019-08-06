// import { getSDK } from "./externals/public-lib/appserviceSdk"
import { VirtualWebSocketClient } from "./virtual-websocket-client"
import {
  // throwErrorIfNetworkOffline,
  sleep
  // onceNetworkOnline
  // getWXVersion,
  // getNetworkStatus
} from "../utils/utils"
// import { getRealtimeConnectionSignature } from "../../../internal/backend-api/backend-api"
import { genRequestId } from "./message"
// import { DB, WXNS } from "../typings"
import { DB } from "../typings"
import {
  IRequestMessage,
  IResponseMessage,
  IRequestMessagePingMsg,
  IRequestMessageLoginMsg,
  IResponseMessageLoginResMsg
} from "../typings/realtime"
import {
  CLOSE_EVENT_CODE,
  CLOSE_EVENT_CODE_INFO,
  getWSCloseError
} from "./ws-event"
import { CloudSDKError, TimeoutError } from "../utils/error"
// import { CloudSDKError } from "./utils/error"
import { RealtimeErrorMessageError } from "./error"
import { ERR_CODE } from "../config/error.config"

// =============== Realtime WebSocket Client (Internal) ====================

export interface IRealtimeWebSocketClientConstructorOptions {
  maxReconnect?: number
  reconnectInterval?: number
  context: DB.IDatabaseServiceContext
}

export interface ISignature {
  envId: string
  secretVersion: number
  signStr: string
  wsUrl: string
  expireTS: number
}

export interface ILoginInfo {
  loggedIn: boolean
  loggingInPromise?: Promise<ILoginResult>
  loginStartTS?: number
  loginResult?: ILoginResult
}

export interface ILoginResult {
  envId: string
}

export interface IWSSendOptions {
  msg: IRequestMessage
  waitResponse?: boolean
  // when waitResponse is set to true, if skipOnMessage is true, general onMessage handler will be skipped
  skipOnMessage?: boolean
  timeout?: number
}

export interface IWSWatchOptions extends DB.IWatchOptions {
  envId?: string
  collectionName: string
  query: string
}

interface IResolveReject {
  resolve: (value?: any | PromiseLike<any> | undefined) => void
  reject: (reason?: any) => void
}

interface IResponseWaitSpec extends IResolveReject {
  skipOnMessage?: boolean
}

const WS_READY_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
}

const MAX_RTT_OBSERVED = 3
const DEFAULT_EXPECTED_EVENT_WAIT_TIME = 5000
const DEFAULT_UNTRUSTED_RTT_THRESHOLD = 10000
const DEFAULT_MAX_RECONNECT = 5
const DEFAULT_WS_RECONNECT_INTERVAL = 10000
// const DEFAULT_WS_RECONNECT_MAX_VALID_INTERVAL = 3 * 60 * 1000
const DEFAULT_PING_FAIL_TOLERANCE = 2
const DEFAULT_PONG_MISS_TOLERANCE = 2
const DEFAULT_LOGIN_TIMEOUT = 5000

export class RealtimeWebSocketClient {
  private _virtualWSClient: Set<VirtualWebSocketClient> = new Set()
  // after listener initWatch, the listener has the queryID and can store it here
  private _queryIdClientMap: Map<string, VirtualWebSocketClient> = new Map()
  private _watchIdClientMap: Map<string, VirtualWebSocketClient> = new Map()
  private _maxReconnect: number
  // private _availableRetries: number
  private _reconnectInterval: number
  private _context: DB.IDatabaseServiceContext
  // private _ws?: WXNS.Socket.ISocketTask
  private _ws?: any
  private _lastPingSendTS?: number
  private _pingFailed: number = 0
  private _pongMissed: number = 0
  private _pingTimeoutId?: number
  private _pongTimeoutId?: number
  private _logins: Map<string /* envId */, ILoginInfo> = new Map()
  // private _loginInfo: ILoginInfo
  // private _signatures: Map<string /* envId */, ISignature> = new Map()
  private _wsInitPromise?: Promise<void>
  private _wsReadySubsribers: IResolveReject[] = []
  private _wsResponseWait: Map<
    string /* requestId */,
    IResponseWaitSpec
  > = new Map()
  private _rttObserved: number[] = []
  private _reconnectState: boolean
  // obtained from the first getSignature with no envId provided
  // private _defaultEnvId?: string

  constructor(options: IRealtimeWebSocketClientConstructorOptions) {
    this._maxReconnect = options.maxReconnect || DEFAULT_MAX_RECONNECT
    // this._availableRetries = this._maxReconnect
    this._reconnectInterval =
      options.reconnectInterval || DEFAULT_WS_RECONNECT_INTERVAL
    this._context = options.context
  }

  private initWebSocketConnection = async (
    reconnect: boolean,
    availableRetries: number = this._maxReconnect
  ): Promise<void> => {
    // 当前处于正在重连中的状态
    if (reconnect && this._reconnectState) {
      return // 忽略
    }

    if (reconnect) {
      this._reconnectState = true // 重连状态开始
    }

    if (this._wsInitPromise) {
      // there already exists a websocket initiation, just wait for it
      return this._wsInitPromise
    }

    // if (process.env.DEBUG) {
    console.log(
      `[realtime] initWebSocketConnection reconnect ${reconnect} availableRetries ${availableRetries}`
    )
    // }

    if (reconnect) {
      this.pauseClients()
    }

    this.close(CLOSE_EVENT_CODE.ReconnectWebSocket)

    this._wsInitPromise = new Promise<void>(async (resolve, reject) => {
      try {
        // if (process.env.DEBUG) {
        console.log(
          `[realtime] initWebSocketConnection start throwErrorIfNetworkOffline`
        )
        // }

        // 暂不检查网络态
        // await throwErrorIfNetworkOffline()

        // if (process.env.DEBUG) {
        console.log(`[realtime] initWebSocketConnection start getSignature`)
        // }

        // const signature = await this.getSignature()
        // const accessTokenRes = await this.getAccessToken()
        await this.getAccessToken()

        // if (process.env.DEBUG) {
        console.log(`[realtime] initWebSocketConnection getSignature success`)
        console.log(`[realtime] initWebSocketConnection start connectSocket`)
        // }

        await new Promise(success => {
          // this._ws = getSDK(this._context.identifiers)
          //   ._socketSkipCheckDomainFactory()
          //   .connectSocket({
          //     url: signature.wsUrl,
          //     header: {
          //       "content-type": "application/json"
          //     },
          //     success: () => success(),
          //     fail
          //   })

          // this._ws = new WebSocket("ws://212.129.231.116:80")
          // this._ws = new WebSocket("ws://212.64.45.4:8080")
          this._ws = new WebSocket("wss://tcb-ws.tencentcloudapi.com")
          console.log("(((((((((((((((((((((((((((((((")
          success()
        })

        // if (process.env.DEBUG) {
        console.log(
          `[realtime] initWebSocketConnection connectSocket successfully fired`
        )
        // }

        await this.initWebSocketEvent()
        resolve()

        if (reconnect) {
          this.resumeClients()
          this._reconnectState = false // 重连状态结束
        }
      } catch (e) {
        // if (process.env.DEBUG) {
        console.error(`[realtime] initWebSocketConnection connect fail`, e)
        // }

        if (availableRetries > 0) {
          // this is an optimization, in case of network offline, we don't need to stubbornly sleep for sometime,
          // we only need to wait for the network to be back online, this ensures minimum downtime
          // const { isConnected } = await getNetworkStatus()
          const isConnected = true

          // if (process.env.DEBUG) {
          console.log(
            `[realtime] initWebSocketConnection waiting for network online`
          )
          // }

          // auto wait until network online, cause' it would be meaningless to reconnect while network is offline

          // await onceNetworkOnline()

          // COMPATIBILITY: wait for ide state update
          // if (isDevTools()) {
          //   await sleep(0)
          // }

          // if (process.env.DEBUG) {
          console.log(`[realtime] initWebSocketConnection network online`)
          // }

          this._wsInitPromise = undefined

          if (isConnected) {
            // if (process.env.DEBUG) {
            console.log(
              `[realtime] initWebSocketConnection sleep ${
                this._reconnectInterval
              }ms`
            )
            // }
            await sleep(this._reconnectInterval)
            if (reconnect) {
              this._reconnectState = false // 重连异常也算重连状态结束
            }
          }

          resolve(this.initWebSocketConnection(reconnect, availableRetries - 1))
        } else {
          reject(e)

          if (reconnect) {
            this.closeAllClients(
              new CloudSDKError({
                errCode: ERR_CODE.SDK_DATABASE_REALTIME_LISTENER_RECONNECT_WATCH_FAIL as string,
                errMsg: e
              })
            )
          }
        }
      }
    })

    let success = false

    try {
      await this._wsInitPromise
      success = true
      this._wsReadySubsribers.forEach(({ resolve }) => resolve())
    } catch (e) {
      this._wsReadySubsribers.forEach(({ reject }) => reject())
    } finally {
      this._wsInitPromise = undefined
      this._wsReadySubsribers = []
    }

    // if (process.env.DEBUG) {
    console.log(
      `[realtime] initWebSocketConnection ${success ? "success" : "fail"}`
    )
    // }
  }

  private initWebSocketEvent = () =>
    new Promise<void>((resolve, reject) => {
      if (!this._ws) {
        throw new Error(`can not initWebSocketEvent, ws not exists`)
      }

      let wsOpened = false

      this._ws.onopen = event => {
        // this._ws.onOpen(() => {
        // this._ws.on("open", () => {
        // this._context.debug &&
        console.warn(`[realtime] ws event: open`, event)
        wsOpened = true
        resolve()
      }

      this._ws.onerror = event => {
        // this._ws.on("error", error => {
        // this._ws.onError(error => {
        // all logins are invalid after disconnection
        this._logins = new Map()

        // error写进file

        if (!wsOpened) {
          // this._context.debug &&
          console.error(`[realtime] ws open failed with ws event: error`, event)
          // writeToFile(
          //   "wserror.txt",
          //   `${
          //     this.specialNumber
          //   } [realtime] ws open failed with ws event: error ${error} \n`
          // )

          reject(event)
        } else {
          // this._context.debug &&
          console.error(`[realtime] ws event: error`, event)

          // writeToFile(
          //   "wserror.txt",
          //   `${this.specialNumber} [realtime] ws event: error ${error} \n`
          // )

          this.clearHeartbeat()
          this._virtualWSClient.forEach(client =>
            client.closeWithError(
              new CloudSDKError({
                errCode: ERR_CODE.SDK_DATABASE_REALTIME_LISTENER_WEBSOCKET_CONNECTION_ERROR as string,
                errMsg: event
              })
            )
          )
        }
      }

      // TODO: reconnect
      this._ws.onclose = closeEvent => {
        // this._ws.on("close", (closeEvent, closereason) => {
        // this._ws.onClose(closeEvent => {
        // if (process.env.DEBUG) {
        console.warn(`[realtime] ws event: close`, closeEvent)
        // }

        // writeToFile(
        //   "wsclose.txt",
        //   `${
        //     this.specialNumber
        //   } [realtime] ws event: close ${closeEvent} ${closereason} \n`
        // )

        // all logins are invalid after disconnection
        this._logins = new Map()

        this.clearHeartbeat()
        switch (closeEvent.code) {
          case CLOSE_EVENT_CODE.ReconnectWebSocket: {
            // just ignore
            break
          }
          case CLOSE_EVENT_CODE.NoRealtimeListeners: {
            // quit
            break
          }
          case CLOSE_EVENT_CODE.HeartbeatPingError:
          case CLOSE_EVENT_CODE.HeartbeatPongTimeoutError:
          case CLOSE_EVENT_CODE.NormalClosure:
          case CLOSE_EVENT_CODE.AbnormalClosure: {
            // Normal Closure and Abnormal Closure:
            //   expected closure, most likely dispatched by wechat client,
            //   since this is the status code dispatched in case of network failure,
            //   we should retry

            if (this._maxReconnect > 0) {
              // if (this._availableRetries > 0) {
              this.initWebSocketConnection(true, this._maxReconnect)
            } else {
              this.closeAllClients(getWSCloseError(closeEvent.code))
            }
            break
          }
          case CLOSE_EVENT_CODE.NoAuthentication: {
            this.closeAllClients(
              getWSCloseError(closeEvent.code, closeEvent.reason)
            )
            break
          }
          default: {
            // we should retry by default
            if (this._maxReconnect > 0) {
              // if (this._availableRetries > 0) {
              this.initWebSocketConnection(true, this._maxReconnect)
            } else {
              this.closeAllClients(getWSCloseError(closeEvent.code))
            }
            // console.warn(`[realtime] unrecognize ws close event`, closeEvent)
            // this.closeAllClients(getWSCloseError(closeEvent.code))
          }
        }
      }

      this._ws.onmessage = res => {
        // this._ws.on("message", res => {
        // this._ws.onMessage(res => {
        // const rawMsg = res.data
        const rawMsg = res.data

        // reset & restart heartbeat
        this.heartbeat()

        let msg: IResponseMessage

        try {
          msg = JSON.parse(rawMsg as string)
        } catch (e) {
          throw new Error(`[realtime] onMessage parse res.data error: ${e}`)
        }

        // this._context.debug &&
        // console.log(`[realtime] onMessage (${new Date()})`, msg)
        console.log(
          `[realtime] onMessage ${
            msg.msgType
          } (${new Date().toLocaleString()})`,
          msg
        )

        if (msg.msgType === "ERROR") {
          // 找到当前监听，并将error返回
          let virtualWatch = null
          this._virtualWSClient.forEach(item => {
            if (item.watchId === msg.watchId) {
              virtualWatch = item
            }
          })

          if (virtualWatch) {
            virtualWatch.listener.onError(msg)
          }
        }

        const responseWaitSpec = this._wsResponseWait.get(msg.requestId)
        if (responseWaitSpec) {
          try {
            if (msg.msgType === "ERROR") {
              responseWaitSpec.reject(new RealtimeErrorMessageError(msg))
            } else {
              responseWaitSpec.resolve(msg)
            }
          } catch (e) {
            // this._context.debug &&
            console.error(
              `ws onMessage responseWaitSpec.resolve(msg) errored:`,
              e
            )
          } finally {
            this._wsResponseWait.delete(msg.requestId)
          }
          if (responseWaitSpec.skipOnMessage) {
            return
          }
        }

        if (msg.msgType === "PONG") {
          if (this._lastPingSendTS) {
            const rtt = Date.now() - this._lastPingSendTS
            if (rtt > DEFAULT_UNTRUSTED_RTT_THRESHOLD) {
              // this._context.debug &&
              console.warn(`[realtime] untrusted rtt observed: ${rtt}`)
              return
            }
            if (this._rttObserved.length >= MAX_RTT_OBSERVED) {
              this._rttObserved.splice(
                0,
                this._rttObserved.length - MAX_RTT_OBSERVED + 1
              )
            }
            this._rttObserved.push(rtt)
          }
          return
        }

        let client = msg.watchId && this._watchIdClientMap.get(msg.watchId)
        if (client) {
          client.onMessage(msg)
        } else {
          // TODO, this is a temporary fix done for server
          // if (process.env.DEBUG) {
          console.error(
            `[realtime] no realtime listener found responsible for watchId ${
              msg.watchId
            }: `,
            msg
          )
          // }
          switch (msg.msgType) {
            case "INIT_EVENT":
            case "NEXT_EVENT":
            case "CHECK_EVENT": {
              client = this._queryIdClientMap.get(msg.msgData.queryID)
              if (client) {
                client.onMessage(msg)
              }
              break
            }
            default: {
              for (const [watchId, client] of this._watchIdClientMap) {
                console.log("watchid*****", watchId)
                client.onMessage(msg)
                break
              }
            }
          }
        }
      }

      this.heartbeat()
    })

  private isWSConnected = (): boolean => {
    return Boolean(this._ws && this._ws.readyState === WS_READY_STATE.OPEN)
  }

  private onceWSConnected = async (): Promise<void> => {
    if (this.isWSConnected()) {
      return
    }

    if (this._wsInitPromise) {
      return this._wsInitPromise
    }

    return new Promise<void>((resolve, reject) => {
      this._wsReadySubsribers.push({
        resolve,
        reject
      })
    })
  }

  private webLogin = async (
    envId?: string,
    refresh?: boolean
  ): Promise<any> => {
    if (!refresh) {
      // let loginInfo = this._loginInfo
      if (envId) {
        const loginInfo = this._logins.get(envId)
        if (loginInfo) {
          if (loginInfo.loggedIn && loginInfo.loginResult) {
            // if (process.env.DEBUG) {
            console.log(`[realtime] login: already logged in`)
            // }
            return loginInfo.loginResult
          } else if (loginInfo.loggingInPromise) {
            return loginInfo.loggingInPromise
          }
        }
      } else {
        const emptyEnvLoginInfo = this._logins.get("")
        if (emptyEnvLoginInfo && emptyEnvLoginInfo.loggingInPromise) {
          return emptyEnvLoginInfo.loggingInPromise
        }
      }
    }
    console.log(`[realtime] login: logging in`)

    const promise = new Promise<ILoginResult>(async (resolve, reject) => {
      try {
        // const signature = await this.getSignature(envId, refresh)

        const accessTokenRes = await this.getAccessToken()

        // const wxVersion = getWXVersion()

        const loginMsg: IRequestMessageLoginMsg = {
          watchId: undefined,
          requestId: genRequestId(),
          msgType: "LOGIN",
          msgData: {
            envId: accessTokenRes.env || '',
            accessToken: accessTokenRes.accessToken,
            // signStr: signature.signStr,
            // secretVersion: signature.secretVersion,
            referrer: "web",
            sdkVersion: "",
            dataVersion: ""
          }
        }
        console.log("login requestid************", loginMsg.requestId)

        const loginResMsg = await this.send<IResponseMessageLoginResMsg>({
          msg: loginMsg,
          waitResponse: true,
          skipOnMessage: true,
          timeout: DEFAULT_LOGIN_TIMEOUT
        })

        if (!loginResMsg.msgData.code) {
          // login success
          resolve({
            envId: accessTokenRes.env
          })
        } else {
          // login failed
          reject(
            new Error(
              `${loginResMsg.msgData.code} ${loginResMsg.msgData.message}`
            )
          )
        }
      } catch (e) {
        reject(e)
      }
    })

    // let loginInfo = this._loginInfo
    let loginInfo = envId && this._logins.get(envId)

    const loginStartTS = Date.now()

    if (loginInfo) {
      loginInfo.loggedIn = false
      loginInfo.loggingInPromise = promise
      loginInfo.loginStartTS = loginStartTS
    } else {
      loginInfo = {
        loggedIn: false,
        loggingInPromise: promise,
        loginStartTS
      }
      // this._loginInfo = loginInfo
      this._logins.set(envId || "", loginInfo)
    }

    // try {
    //   const loginResult = await promise
    //   loginInfo.loggedIn = true
    //   loginInfo.loggingInPromise = undefined
    //   loginInfo.loginStartTS = undefined
    //   loginInfo.loginResult = loginResult
    //   return loginResult
    // } catch (e) {
    //   loginInfo.loggedIn = false
    //   loginInfo.loggingInPromise = undefined
    //   loginInfo.loginStartTS = undefined
    //   loginInfo.loginResult = undefined
    //   throw e
    // }

    try {
      const loginResult = await promise
      const curLoginInfo = envId && this._logins.get(envId)
      if (
        curLoginInfo &&
        curLoginInfo === loginInfo &&
        curLoginInfo.loginStartTS === loginStartTS
      ) {
        loginInfo.loggedIn = true
        loginInfo.loggingInPromise = undefined
        loginInfo.loginStartTS = undefined
        loginInfo.loginResult = loginResult
        return loginResult
      } else if (curLoginInfo) {
        if (curLoginInfo.loggedIn && curLoginInfo.loginResult) {
          return curLoginInfo.loginResult
        } else if (curLoginInfo.loggingInPromise) {
          return curLoginInfo.loggingInPromise
        } else {
          throw new Error(`ws unexpected login info`)
        }
      } else {
        throw new Error(`ws login info reset`)
      }
    } catch (e) {
      loginInfo.loggedIn = false
      loginInfo.loggingInPromise = undefined
      loginInfo.loginStartTS = undefined
      loginInfo.loginResult = undefined
      throw e
    }
  }

  // private login = async (
  //   envId?: string,
  //   refresh?: boolean
  // ): Promise<ILoginResult> => {
  //   envId = envId || this._context.env || this._defaultEnvId
  //   if (!refresh) {
  //     if (envId) {
  //       const loginInfo = this._logins.get(envId)
  //       if (loginInfo) {
  //         if (loginInfo.loggedIn && loginInfo.loginResult) {
  //           if (process.env.DEBUG) {
  //             console.log(`[realtime] login: already logged in`)
  //           }
  //           return loginInfo.loginResult
  //         } else if (loginInfo.loggingInPromise) {
  //           return loginInfo.loggingInPromise
  //         }
  //       }
  //     } else {
  //       const emptyEnvLoginInfo = this._logins.get("")
  //       if (emptyEnvLoginInfo && emptyEnvLoginInfo.loggingInPromise) {
  //         return emptyEnvLoginInfo.loggingInPromise
  //       }
  //     }
  //   }

  //   if (process.env.DEBUG) {
  //     console.log(`[realtime] login: logging in`)
  //   }

  //   const promise = new Promise<ILoginResult>(async (resolve, reject) => {
  //     try {
  //       // const signature = await this.getSignature(envId, refresh)

  //       const accessTokenRes = await this.getAccessToken()

  //       // const wxVersion = getWXVersion()

  //       const loginMsg: IRequestMessageLoginMsg = {
  //         watchId: undefined,
  //         requestId: genRequestId(),
  //         msgType: "LOGIN",
  //         msgData: {
  //           envId: accessTokenRes.env,
  //           accessToken: accessTokenRes.accessToken,
  //           // signStr: signature.signStr,
  //           // secretVersion: signature.secretVersion,
  //           referrer: "web",
  //           sdkVersion: "",
  //           dataVersion: ""
  //         }
  //       }
  //       console.log("login requestid************", loginMsg.requestId)

  //       const loginResMsg = await this.send<IResponseMessageLoginResMsg>({
  //         msg: loginMsg,
  //         waitResponse: true,
  //         skipOnMessage: true,
  //         timeout: DEFAULT_LOGIN_TIMEOUT
  //       })

  //       if (!loginResMsg.msgData.code) {
  //         // login success
  //         resolve({
  //           // envId: signature.envId
  //         })
  //       } else {
  //         // login failed
  //         reject(
  //           new Error(
  //             `${loginResMsg.msgData.code} ${loginResMsg.msgData.message}`
  //           )
  //         )
  //       }
  //     } catch (e) {
  //       reject(e)
  //     }
  //   })

  //   let loginInfo = envId && this._logins.get(envId)

  //   // used for concurrent force re-login on same env
  //   // for example if there's a login invocation with refresh equals false,
  //   // then another login invocation with refresh equals true comes in,
  //   // then the result of the first login invocation must be discarded
  //   const loginStartTS = Date.now()

  //   if (loginInfo) {
  //     loginInfo.loggedIn = false
  //     loginInfo.loggingInPromise = promise
  //     loginInfo.loginStartTS = loginStartTS
  //   } else {
  //     loginInfo = {
  //       loggedIn: false,
  //       loggingInPromise: promise,
  //       loginStartTS
  //     }

  //     // '' => default env
  //     this._logins.set(envId || "", loginInfo)
  //   }

  //   try {
  //     const loginResult = await promise
  //     const curLoginInfo = envId && this._logins.get(envId)
  //     if (
  //       curLoginInfo &&
  //       curLoginInfo === loginInfo &&
  //       curLoginInfo.loginStartTS === loginStartTS
  //     ) {
  //       loginInfo.loggedIn = true
  //       loginInfo.loggingInPromise = undefined
  //       loginInfo.loginStartTS = undefined
  //       loginInfo.loginResult = loginResult
  //       return loginResult
  //     } else if (curLoginInfo) {
  //       if (curLoginInfo.loggedIn && curLoginInfo.loginResult) {
  //         return curLoginInfo.loginResult
  //       } else if (curLoginInfo.loggingInPromise) {
  //         return curLoginInfo.loggingInPromise
  //       } else {
  //         throw new Error(`ws unexpected login info`)
  //       }
  //     } else {
  //       throw new Error(`ws login info reset`)
  //     }
  //   } catch (e) {
  //     loginInfo.loggedIn = false
  //     loginInfo.loggingInPromise = undefined
  //     loginInfo.loginStartTS = undefined
  //     loginInfo.loginResult = undefined
  //     throw e
  //   }
  // }

  private getAccessToken = async (): Promise<any> => {
    // envId = envId || this._context.env || this._defaultEnvId
    return this._context.appConfig.getAccessToken()
  }

  // private getSignature = async (
  //   envId?: string,
  //   refresh?: boolean
  // ): Promise<ISignature> => {
  //   envId = envId || this._context.env || this._defaultEnvId
  //   if (!refresh && envId && this._signatures.has(envId)) {
  //     const signature = this._signatures.get(envId)!
  //     if (Date.now() < signature.expireTS) {
  //       if (process.env.DEBUG) {
  //         console.log(
  //           `[realtime] getSignature: signature not expired yet, expired time : ${new Date(
  //             signature.expireTS
  //           )}`
  //         )
  //       }
  //       return signature
  //     } else if (process.env.DEBUG) {
  //       console.log(
  //         `[realtime] getSignature: signature expired, expired time : ${new Date(
  //           signature.expireTS
  //         )}`
  //       )
  //     }
  //   } else if (process.env.DEBUG) {
  //     refresh
  //       ? console.log(`[realtime] getSignature force refresh`)
  //       : console.log(`[realtime] getSignature for ${envId} for the first time`)
  //   }

  //   // const signatureResp = await getRealtimeConnectionSignature(this._context)

  //   // const signature: ISignature = {
  //   //   ...signatureResp,
  //   //   expireTS: +new Date() + 60 * 1000
  //   // }

  //   // mock signature
  //   const signature = {
  //     envId: "alan-test-app2-exp",
  //     secretVersion: 1564215208,
  //     signStr:
  //       "HNsVUC8AItoJvBErqefNvSCNIfI8pcTo8m3FWy/1+s9d3viYnYmpbfCtzGa4OYu9osviC/Ps5dmDlxow9TzJN26PNaDXkn7iHJfpTpsDZTJUtq/sXaeuSwMTYt4Cs25LPgi7/+GHK8qd8LtMsofzCOJpqrsUI9COGCgcQTrRcgPHLGIEql9uh/vQSWtZHHtltjFykbUYRlbGN5LGWU27CjHa8sBmyUEnJMnIfDS/oYKPjFJv1cmg9bh7yZ5bGTPApaQ5JON/65Rfv0TItt7PzoPoUUdSlujC8JcPTI5zXxIx9vjpUdvy3fXwmejLi1JZDnHPOOBFirJEHbsu+QvhCAyNpvCNmm+zMar0vtb2f2UAfxdp1F82AmYSsteoVkEdFVS/yKkSmQ2eJFET2ItwfmLo+k9/31Dje3t3Kjq7DfIXrsik6X1nOcWUt6I/grxp5kgQRj30RLq8HASdvo2rlub5cqECk+wLamRVOnifyakIj7hERDoi6PPnGm6Xvt2Sj4OpoRUGGOoZN7TcUy9ZuC7AcMGUtT5+dgiGa4QLpe/WyNN+x5SQ4FGLIGLpZ3xRmeegj8ivDQ/zMKyLqGmumgHRbDqUMK+tFLJFNNn+c+xi2rjKs7ZP2O7mLNEIPr9/vXqMxG2h3ueY8jpTMMIIT4DWmvUoT5t1SJjV7y7cfkwT25lt3JNxSAJ4vBoa4Om/U9v1zpG+otO8wSnJ+c6XE87PUIago2AdbZ7Fm/gNaZKUm7mVok8iGqo6k95pJPhsplp0HGDWJ72vyQmSRTegPbgX9gRP6tTtcXM3ckEWygvzhD41pAxostATgZAKrrq/63BEfswqJyQjFMowZcB4/Sfx26o27rvjdqzQn9R2CYnHtYCJXa41ppOESEZE80KhcHW7d4765M9wr8y2OSlYKu2jQ4pu1bF9/TZigdhMPejAlYNANw9Slx0pkrb1h4a+XX88+D/mJTofGiPJnONSN5sVJRNSz0LjbYYLr/j0s76RvDwYhvxzJIcKw+12ADXHEOHN5yZFK2hwCVKRAp4eM1CRFmAhYStNh72SkfpU6qpQVwb8mz5GXd07WClYSb8CU31UVn+oBg5dCVWnoFS+4TDu",
  //     // wsUrl: "ws://212.129.231.117:80",
  //     wsUrl: "ws://100.67.101.183:8008",
  //     expireTS: +new Date() + 60 * 1000
  //   }

  //   this._signatures.set(signature.envId, signature)
  //   if (!envId) {
  //     // context.envId === undefined, using default envId
  //     this._defaultEnvId = signature.envId
  //   }

  //   return signature
  // }

  private getWaitExpectedTimeoutLength = () => {
    if (!this._rttObserved.length) {
      return DEFAULT_EXPECTED_EVENT_WAIT_TIME
    }

    // 1.5 * RTT
    return (
      (this._rttObserved.reduce((acc, cur) => acc + cur) /
        this._rttObserved.length) *
      1.5
    )
  }

  private heartbeat(immediate?: boolean) {
    this.clearHeartbeat()
    this._pingTimeoutId = setTimeout(
      async () => {
        try {
          if (!this._ws || this._ws.readyState !== WS_READY_STATE.OPEN) {
            // no need to ping
            return
          }

          this._lastPingSendTS = Date.now()
          await this.ping()
          this._pingFailed = 0

          this._pongTimeoutId = setTimeout(() => {
            console.error(`pong timed out`)
            if (this._pongMissed < DEFAULT_PONG_MISS_TOLERANCE) {
              this._pongMissed++
              this.heartbeat(true)
            } else {
              // logical perceived connection lost, even though websocket did not receive error or close event
              this.initWebSocketConnection(true)
            }
          }, this._context.appConfig.realtimePongWaitTimeout)
        } catch (e) {
          if (this._pingFailed < DEFAULT_PING_FAIL_TOLERANCE) {
            this._pingFailed++
            this.heartbeat()
          } else {
            this.close(CLOSE_EVENT_CODE.HeartbeatPingError)
          }
        }
      },
      immediate ? 0 : this._context.appConfig.realtimePingInterval
    )
  }

  clearHeartbeat() {
    this._pingTimeoutId && clearTimeout(this._pingTimeoutId)
    this._pongTimeoutId && clearTimeout(this._pongTimeoutId)
  }

  private ping = async () => {
    const msg: IRequestMessagePingMsg = {
      watchId: undefined,
      requestId: genRequestId(),
      msgType: "PING",
      msgData: null
    }
    await this.send({
      msg
    })
    console.log("ping sent")
  }

  send = <T = any>(opts: IWSSendOptions): Promise<T> =>
    new Promise<T>(async (_resolve, _reject) => {
      let timeoutId: number
      let _hasResolved = false
      let _hasRejected = false

      const resolve: typeof _resolve = (
        value?: T | PromiseLike<T> | undefined
      ) => {
        _hasResolved = true
        timeoutId && clearTimeout(timeoutId)
        _resolve(value)
      }

      const reject: typeof _reject = (error: any) => {
        _hasRejected = true
        timeoutId && clearTimeout(timeoutId)
        _reject(error)
      }

      if (opts.timeout) {
        timeoutId = setTimeout(async () => {
          if (!_hasResolved || !_hasRejected) {
            // wait another immediate timeout to allow the success/fail callback to be invoked if ws has already got the result,
            // this is because the timer is registered before ws.send
            await sleep(0)
            if (!_hasResolved || !_hasRejected) {
              reject(new TimeoutError(`wsclient.send timedout`))
            }
          }
        }, opts.timeout)
      }

      try {
        // if (this._context.debug) {
        // console.log(`[realtime] ws send (${new Date()}): `, opts)
        console.log(
          `[realtime] ws send ${
            opts.msg.msgType
          } (${new Date().toLocaleString()}): `,
          opts
        )
        // }

        if (this._wsInitPromise) {
          await this._wsInitPromise
        }

        if (!this._ws) {
          reject(
            new Error(
              `invalid state: ws connection not exists, can not send message`
            )
          )
          return
        }

        if (this._ws.readyState !== WS_READY_STATE.OPEN) {
          reject(
            new Error(
              `ws readyState invalid: ${
                this._ws.readyState
              }, can not send message`
            )
          )
          return
        }

        if (opts.waitResponse) {
          this._wsResponseWait.set(opts.msg.requestId, {
            resolve,
            reject,
            skipOnMessage: opts.skipOnMessage
          } as IResponseWaitSpec)
        }

        console.log("send msg:", opts.msg)
        try {
          this._ws.send(JSON.stringify(opts.msg))
          if (!opts.waitResponse) {
            resolve()
          }
        } catch (err) {
          if (err) {
            reject(err)
            if (opts.waitResponse) {
              this._wsResponseWait.delete(opts.msg.requestId)
            }
          }
        }
        // this._ws.send(JSON.stringify(opts.msg), err => {
        //   if (err) {
        //     reject(err)
        //     if (opts.waitResponse) {
        //       this._wsResponseWait.delete(opts.msg.requestId)
        //     }
        //     return
        //   }

        //   if (!opts.waitResponse) {
        //     resolve()
        //   }
        // })

        // this._ws.send({
        //   data: JSON.stringify(opts.msg),
        //   success: res => {
        //     if (!opts.waitResponse) {
        //       resolve(res)
        //     }
        //   },
        //   fail: e => {
        //     reject(e)
        //     if (opts.waitResponse) {
        //       this._wsResponseWait.delete(opts.msg.requestId)
        //     }
        //   }
        // })
      } catch (e) {
        reject(e)
      }
    })

  close(code: CLOSE_EVENT_CODE) {
    this.clearHeartbeat()

    if (this._ws) {
      this._ws.close(code, CLOSE_EVENT_CODE_INFO[code].name)
      this._ws = undefined
    }
  }

  closeAllClients = (error: any) => {
    this._virtualWSClient.forEach(client => {
      client.closeWithError(error)
    })
  }

  pauseClients = (clients?: Set<VirtualWebSocketClient>) => {
    ;(clients || this._virtualWSClient).forEach(client => {
      client.pause()
    })
  }

  resumeClients = (clients?: Set<VirtualWebSocketClient>) => {
    ;(clients || this._virtualWSClient).forEach(client => {
      client.resume()
    })
  }

  private onWatchStart = (client: VirtualWebSocketClient, queryID: string) => {
    this._queryIdClientMap.set(queryID, client)
  }

  private onWatchClose = (client: VirtualWebSocketClient, queryID: string) => {
    if (queryID) {
      this._queryIdClientMap.delete(queryID)
    }
    this._watchIdClientMap.delete(client.watchId)
    this._virtualWSClient.delete(client)

    if (!this._virtualWSClient.size) {
      // no more existing watch, we should release the websocket connection
      this.close(CLOSE_EVENT_CODE.NoRealtimeListeners)
    }
  }

  watch(options: IWSWatchOptions): DB.RealtimeListener {
    if (!this._ws && !this._wsInitPromise) {
      this.initWebSocketConnection(false)
    }

    const virtualClient = new VirtualWebSocketClient({
      ...options,
      send: this.send,
      login: this.webLogin,
      isWSConnected: this.isWSConnected,
      onceWSConnected: this.onceWSConnected,
      getWaitExpectedTimeoutLength: this.getWaitExpectedTimeoutLength,
      onWatchStart: this.onWatchStart,
      onWatchClose: this.onWatchClose,
      debug: true
    })
    this._virtualWSClient.add(virtualClient)
    this._watchIdClientMap.set(virtualClient.watchId, virtualClient)
    return virtualClient.listener
  }
}
