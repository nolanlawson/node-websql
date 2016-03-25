'use strict';

var sqlite3 = require('sqlite3');
var customOpenDatabase = require('./custom');

module.exports = customOpenDatabase(sqlite3);