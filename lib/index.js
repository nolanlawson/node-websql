'use strict';

var sqlite3 = require('sqlite3');
var immediate = require('immediate');
var argsarray = require('argsarray');
var noop = require('noop-fn');

var WebSQLDatabase = require('./WebSQLDatabase');

function createDb(dbName, dbVersion) {
  var sqliteDatabase = new sqlite3.Database(dbName);
  return new WebSQLDatabase(dbVersion, sqliteDatabase);
}

function openDatabase(args) {

  if (args.length < 4) {
    throw new Error('Failed to execute \'openDatabase\': ' +
      '4 arguments required, but only ' + args.length + ' present');
  }

  var dbName = args[0];
  var dbVersion = args[1];
  // db description and size are ignored
  var callback = args[4] || noop;

  var db = createDb(dbName, dbVersion);

  immediate(function () {
    callback(db);
  });

  return db;
}

module.exports = argsarray(openDatabase);