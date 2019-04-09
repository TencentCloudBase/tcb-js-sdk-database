"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var logic_1 = require("./logic");
var symbol_1 = require("../helper/symbol");
exports.EQ = 'eq';
exports.NEQ = 'neq';
exports.GT = 'gt';
exports.GTE = 'gte';
exports.LT = 'lt';
exports.LTE = 'lte';
exports.IN = 'in';
exports.NIN = 'nin';
var QUERY_COMMANDS_LITERAL;
(function (QUERY_COMMANDS_LITERAL) {
    QUERY_COMMANDS_LITERAL["EQ"] = "eq";
    QUERY_COMMANDS_LITERAL["NEQ"] = "neq";
    QUERY_COMMANDS_LITERAL["GT"] = "gt";
    QUERY_COMMANDS_LITERAL["GTE"] = "gte";
    QUERY_COMMANDS_LITERAL["LT"] = "lt";
    QUERY_COMMANDS_LITERAL["LTE"] = "lte";
    QUERY_COMMANDS_LITERAL["IN"] = "in";
    QUERY_COMMANDS_LITERAL["NIN"] = "nin";
})(QUERY_COMMANDS_LITERAL = exports.QUERY_COMMANDS_LITERAL || (exports.QUERY_COMMANDS_LITERAL = {}));
var QueryCommand = (function (_super) {
    __extends(QueryCommand, _super);
    function QueryCommand(operator, operands, fieldName) {
        var _this = _super.call(this, operator, operands, fieldName) || this;
        _this.operator = operator;
        _this._internalType = symbol_1.SYMBOL_QUERY_COMMAND;
        return _this;
    }
    QueryCommand.prototype._setFieldName = function (fieldName) {
        var command = new QueryCommand(this.operator, this.operands, fieldName);
        return command;
    };
    QueryCommand.prototype.eq = function (val) {
        var command = new QueryCommand(QUERY_COMMANDS_LITERAL.EQ, [val], this.fieldName);
        return this.and(command);
    };
    QueryCommand.prototype.neq = function (val) {
        var command = new QueryCommand(QUERY_COMMANDS_LITERAL.NEQ, [val], this.fieldName);
        return this.and(command);
    };
    QueryCommand.prototype.gt = function (val) {
        var command = new QueryCommand(QUERY_COMMANDS_LITERAL.GT, [val], this.fieldName);
        return this.and(command);
    };
    QueryCommand.prototype.gte = function (val) {
        var command = new QueryCommand(QUERY_COMMANDS_LITERAL.GTE, [val], this.fieldName);
        return this.and(command);
    };
    QueryCommand.prototype.lt = function (val) {
        var command = new QueryCommand(QUERY_COMMANDS_LITERAL.LT, [val], this.fieldName);
        return this.and(command);
    };
    QueryCommand.prototype.lte = function (val) {
        var command = new QueryCommand(QUERY_COMMANDS_LITERAL.LTE, [val], this.fieldName);
        return this.and(command);
    };
    QueryCommand.prototype.in = function (list) {
        var command = new QueryCommand(QUERY_COMMANDS_LITERAL.IN, list, this.fieldName);
        return this.and(command);
    };
    QueryCommand.prototype.nin = function (list) {
        var command = new QueryCommand(QUERY_COMMANDS_LITERAL.NIN, list, this.fieldName);
        return this.and(command);
    };
    return QueryCommand;
}(logic_1.LogicCommand));
exports.QueryCommand = QueryCommand;
function isQueryCommand(object) {
    return object && (object instanceof QueryCommand) && (object._internalType === symbol_1.SYMBOL_QUERY_COMMAND);
}
exports.isQueryCommand = isQueryCommand;
function isKnownQueryCommand(object) {
    return isQueryCommand(object) && (object.operator.toUpperCase() in QUERY_COMMANDS_LITERAL);
}
exports.isKnownQueryCommand = isKnownQueryCommand;
function isComparisonCommand(object) {
    return isQueryCommand(object);
}
exports.isComparisonCommand = isComparisonCommand;
exports.default = QueryCommand;
