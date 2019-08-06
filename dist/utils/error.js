"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const type_1 = require("./type");
const msg_1 = require("./msg");
const error_config_1 = require("../config/error.config");
class CloudSDKError extends Error {
    constructor(options) {
        super(options.errMsg);
        this.errCode = "UNKNOWN_ERROR";
        Object.defineProperties(this, {
            message: {
                get() {
                    return (`errCode: ${this.errCode} ${error_config_1.ERR_CODE[this.errCode] ||
                        ""} | errMsg: ` + this.errMsg);
                },
                set(msg) {
                    this.errMsg = msg;
                }
            }
        });
        this.errCode = options.errCode || "UNKNOWN_ERROR";
        this.errMsg = options.errMsg;
    }
    get message() {
        return `errCode: ${this.errCode} | errMsg: ` + this.errMsg;
    }
    set message(msg) {
        this.errMsg = msg;
    }
}
exports.CloudSDKError = CloudSDKError;
function isSDKError(error) {
    return (error && error instanceof Error && type_1.isString(error.errMsg));
}
exports.isSDKError = isSDKError;
function returnAsCloudSDKError(err, appendMsg = "") {
    if (err) {
        if (isSDKError(err)) {
            if (appendMsg) {
                err.errMsg += "; " + appendMsg;
            }
            return err;
        }
        const errCode = err ? err.errCode : undefined;
        const errMsg = ((err && err.errMsg) || err.toString() || "unknown error") +
            "; " +
            appendMsg;
        return new CloudSDKError({
            errCode,
            errMsg
        });
    }
    return new CloudSDKError({
        errMsg: appendMsg
    });
}
exports.returnAsCloudSDKError = returnAsCloudSDKError;
function returnAsFinalCloudSDKError(err, apiName) {
    if (err && isSDKError(err)) {
        return err;
    }
    const e = returnAsCloudSDKError(err, `at ${apiName} api; `);
    e.errMsg = msg_1.apiFailMsg(apiName, e.errMsg);
    return e;
}
exports.returnAsFinalCloudSDKError = returnAsFinalCloudSDKError;
exports.isGenericError = (e) => e.generic;
class TimeoutError extends Error {
    constructor(message) {
        super(message);
        this.type = "timeout";
        this.payload = null;
        this.generic = true;
    }
}
exports.TimeoutError = TimeoutError;
exports.isTimeoutError = (e) => e.type === "timeout";
class CancelledError extends Error {
    constructor(message) {
        super(message);
        this.type = "cancelled";
        this.payload = null;
        this.generic = true;
    }
}
exports.CancelledError = CancelledError;
exports.isCancelledError = (e) => e.type === "cancelled";
