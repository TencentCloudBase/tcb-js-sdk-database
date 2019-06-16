export const ERR_CODE: { [key: string]: string | number } = {
  "-1": "",
  UNKNOWN_ERROR: -1,

  // 以 6 开始的是由微信服务器侧产生的错误码
  // 以 5 开始的是由腾讯云侧产生的错误码
  // 以 4 开始的是本地 SDK 产生的错误
  // 接下来两位表示具体业务类型：01通用，02数据库，03文件，04云函数
  // 最后三位表示具体的错误

  // 小程序 SDK 通用
  "-401001": "api permission denied",
  SDK_API_PERMISSION_DENIED: -401001,
  "-401002": "api parameter error",
  SDK_API_PARAMETER_ERROR: -401002,
  "-401003": "api parameter type error",
  SDK_API_PARAMETER_TYPE_ERROR: -401003,

  // 小程序 SDK 数据库
  "-402001": "circular reference detected",
  SDK_DATABASE_CIRCULAR_REFERENCE: -402001,
  "-402002": "realtime listener init watch fail",
  SDK_DATABASE_REALTIME_LISTENER_INIT_WATCH_FAIL: -402002,
  "-402003": "realtime listener reconnect watch fail",
  SDK_DATABASE_REALTIME_LISTENER_RECONNECT_WATCH_FAIL: -402003,
  "-402004": "realtime listener rebuild watch fail",
  SDK_DATABASE_REALTIME_LISTENER_REBUILD_WATCH_FAIL: -402004,
  "-402005": "realtime listener rebuild watch fail",
  SDK_DATABASE_REALTIME_LISTENER_CLOSE_WATCH_FAIL: -402005,
  "-402006": "realtime listener receive server error msg",
  SDK_DATABASE_REALTIME_LISTENER_SERVER_ERROR_MSG: -402006,
  "-402007": "realtime listener receive invalid server data",
  SDK_DATABASE_REALTIME_LISTENER_RECEIVE_INVALID_SERVER_DATA: -402007,
  "-402008": "realtime listener websocket connection error",
  SDK_DATABASE_REALTIME_LISTENER_WEBSOCKET_CONNECTION_ERROR: -402008,
  "-402009": "realtime listener websocket connection closed",
  SDK_DATABASE_REALTIME_LISTENER_WEBSOCKET_CONNECTION_CLOSED: -402009,
  "-402010": "realtime listener check last fail",
  SDK_DATABASE_REALTIME_LISTENER_CHECK_LAST_FAIL: -402010,
  "-402011": "realtime listener unexpected fatal error",
  SDK_DATABASE_REALTIME_LISTENER_UNEXPECTED_FATAL_ERROR: -402011,

  // 小程序 SDK 文件存储
  "-403001": "max upload file size exceeded",
  SDK_STORAGE_EXCEED_MAX_UPLOAD_SIZE: -403001,
  "-403002": "internal server error: empty upload url",
  SDK_STORAGE_INTERNAL_SERVER_ERROR_EMPTY_UPLOAD_URL: -403002,
  "-403003": "internal server error: empty download url",
  SDK_STORAGE_INTERNAL_SERVER_ERROR_EMPTY_DOWNLOAD_URL: -403003,

  // 小程序 SDK 云函数
  "-404001": "empty call result",
  SDK_FUNCTIONS_EMPTY_CALL_RESULT: -404001,
  "-404002": "empty event id",
  SDK_FUNCTIONS_EMPTY_EVENT_ID: -404002,
  "-404003": "empty poll url",
  SDK_FUNCTIONS_EMPTY_POLL_URL: -404003,
  "-404004": "empty poll result json",
  SDK_FUNCTIONS_EMPTY_POLL_RESULT_JSON: -404004,
  "-404005": "exceed max poll retry",
  SDK_FUNCTIONS_EXCEED_MAX_POLL_RETRY: -404005,
  "-404006": "empty poll result base resp",
  SDK_FUNCTIONS_EMPTY_POLL_RESULT_BASE_RESP: -404006,
  "-404007": "error while waiting for the result",
  SDK_FUNCTIONS_POLL_RESULT_BASE_RESP_RET_ABNORMAL: -404007,
  "-404008": "error while waiting for the result",
  SDK_FUNCTIONS_POLL_RESULT_STATUS_CODE_ERROR: -404008,
  "-404009": "error while waiting for the result",
  SDK_FUNCTIONS_POLL_ERROR: -404009,
  "-404010": "result expired",
  SDK_FUNCTIONS_POLL_RESULT_EXPIRED: -404010,
  "-404011": "cloud function execution error",
  SDK_FUNCTIONS_CLOUD_FUNCTION_EXECUTION_ERROR: -404011,
  "-404012": "error while waiting for the result",
  SDK_FUNCTIONS_EXCEED_MAX_TIMEOUT_POLL_RETRY: -404012,
  "-404013": "error while waiting for the result",
  SDK_FUNCTIONS_EXCEED_MAX_SYSTEM_ERROR_POLL_RETRY: -404013,

  // 微信服务器
  "-601001": "system error",
  WX_SYSTEM_ERROR: -601001,
  "-601002": "system args error",
  WX_SYSTEM_ARGS_ERROR: -601002,
  "-601003": "system network error",
  WX_SYSTEM_NETWORK_ERROR: -601003,
  "-601004": "api permission denied",
  WX_API_PERMISSION_DENIED: -601004,

  // 腾讯云通用
  "-501001": "resource system error", // 云资源系统错误
  TCB_RESOURCE_SYSTEM_ERROR: -501001,
  "-501002": "resource server timeout", // 云资源服务器响应超时
  TCB_RESOURCE_SERVER_TIMEOUT: -501002,
  "-501003": "exceed request limit", // 该环境请求超过配额限制
  TCB_EXCEED_REQUEST_LIMIT: -501003,
  "-501004": "exceed concurrent request limit", // 该环境请求并发超过配额
  TCB_EXCEED_CONCURRENT_REQUEST_LIMIT: -501004,
  "-501005": "invalid env", // 环境信息异常
  TCB_INVALID_ENV: -501005,
  "-501006": "invalid common parameters", // 公共参数非法
  TCB_INVALID_COMMON_PARAM: -501006,
  "-501007": "invalid parameters", // 参数错误
  TCB_INVALID_PARAM: -501007,
  "-501008": "invalid request source", // 请求来源非法
  TCB_INVALID_REQUEST_SOURCE: -501008,
  "-501009": "resource not initialized", // 操作的资源不存在或者非法
  TCB_RESOURCE_NOT_INITIALIZED: -501009,

  // 腾讯云数据库
  "-502001": "database request fail", // 操作数据库异常
  TCB_DB_REQUEST_FAIL: -502001,
  "-502002": "database invalid command", // 非法的数据库指令
  TCB_DB_INVALID_COMMAND: -502002,
  "-502003": "database permission denied", // 无权限操作数据库
  TCB_DB_PERMISSION_DENIED: -502003,
  "-502004": "database exceed collection limit", // 集合数量超过限制
  TCB_DB_EXCEED_COLLECTION_LIMIT: -502004,
  "-502005": "database collection not exists", // 集合不存在
  TCB_DB_COLLECTION_NOT_EXISTS: -502005,

  // 腾讯云文件管理
  "-503001": "storage request fail", // 文件服务器调用失败
  TCB_STORAGE_REQUEST_FAIL: -503001,
  "-503002": "storage permission denied", // 无权限访问文件
  TCB_STORAGE_PERMISSION_DENIED: -503002,
  "-503003": "storage file not exists", // 文件不存在
  TCB_STORAGE_FILE_NOT_EXISTS: -503003,
  "-503004": "storage invalid sign parameter", // 文件签名参数错误
  TCB_STORAGE_INVALID_SIGN_PARAM: -503004,

  // 腾讯云云函数
  "-504001": "functions request fail", // 云函数调用失败
  TCB_FUNCTIONS_REQUEST_FAIL: -504001,
  "-504002": "functions execute fail", // 云函数执行失败
  TCB_FUNCTIONS_EXEC_FAIL: -504002
}
