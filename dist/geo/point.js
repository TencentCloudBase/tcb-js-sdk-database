"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var validate_1 = require("../validate");
var symbol_1 = require("../helper/symbol");
var Point = (function () {
    function Point(longitude, latitude) {
        validate_1.Validate.isGeopoint("longitude", longitude);
        validate_1.Validate.isGeopoint("latitude", latitude);
        this.longitude = longitude;
        this.latitude = latitude;
    }
    Point.prototype.parse = function (key) {
        var _a;
        return _a = {},
            _a[key] = {
                type: 'Point',
                coordinates: [this.longitude, this.latitude]
            },
            _a;
    };
    Point.prototype.toJSON = function () {
        return {
            type: 'Point',
            coordinates: [
                this.longitude,
                this.latitude,
            ],
        };
    };
    Object.defineProperty(Point.prototype, "_internalType", {
        get: function () {
            return symbol_1.SYMBOL_GEO_POINT;
        },
        enumerable: true,
        configurable: true
    });
    return Point;
}());
exports.Point = Point;
