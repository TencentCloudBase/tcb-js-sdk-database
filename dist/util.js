"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var constant_1 = require("./constant");
var point_1 = require("./geo/point");
var serverDate_1 = require("./serverDate");
var Util = (function () {
    function Util() {
    }
    Util.formatResDocumentData = function (documents) {
        return documents.map(function (document) {
            return Util.formatField(document);
        });
    };
    Util.formatField = function (document) {
        var keys = Object.keys(document);
        var protoField = {};
        if (Array.isArray(document)) {
            protoField = [];
        }
        keys.forEach(function (key) {
            var item = document[key];
            var type = Util.whichType(item);
            var realValue;
            switch (type) {
                case constant_1.FieldType.GeoPoint:
                    realValue = new point_1.Point(item.coordinates[0], item.coordinates[1]);
                    break;
                case constant_1.FieldType.Timestamp:
                    realValue = new Date(item.$timestamp * 1000);
                    break;
                case constant_1.FieldType.Object:
                case constant_1.FieldType.Array:
                    realValue = Util.formatField(item);
                    break;
                case constant_1.FieldType.ServerDate:
                    realValue = new Date(item.$date);
                    break;
                default:
                    realValue = item;
            }
            if (Array.isArray(protoField)) {
                protoField.push(realValue);
            }
            else {
                protoField[key] = realValue;
            }
        });
        return protoField;
    };
    Util.whichType = function (obj) {
        var type = Object.prototype.toString.call(obj).slice(8, -1);
        if (type === constant_1.FieldType.Object) {
            if (obj instanceof point_1.Point) {
                return constant_1.FieldType.GeoPoint;
            }
            else if (obj instanceof Date) {
                return constant_1.FieldType.Timestamp;
            }
            else if (obj instanceof serverDate_1.ServerDate) {
                return constant_1.FieldType.ServerDate;
            }
            if (obj.$timestamp) {
                type = constant_1.FieldType.Timestamp;
            }
            else if (obj.$date) {
                type = constant_1.FieldType.ServerDate;
            }
            else if (Array.isArray(obj.coordinates) && obj.type === "Point") {
                type = constant_1.FieldType.GeoPoint;
            }
        }
        return type;
    };
    Util.generateDocId = function () {
        var chars = "ABCDEFabcdef0123456789";
        var autoId = "";
        for (var i = 0; i < 24; i++) {
            autoId += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return autoId;
    };
    return Util;
}());
exports.Util = Util;
