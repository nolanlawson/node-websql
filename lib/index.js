'use strict';

var sqlite3 = require('sqlite3');
var Map = require('pouchdb-collections').Map;
var immediate = require('immediate');
var argsarray = require('argsarray');
var noop = require('noop-fn');

var WebSQLDatabase = require('./WebSQLDatabase');

var dbNamesToDbs = new Map();

//
// openDatabase
//

function createDb(dbName, dbVersion) {
  var sqliteDatabase = new sqlite3.Database(dbName);
  return new WebSQLDatabase(dbName, dbVersion, sqliteDatabase);
}

function openDatabase(args) {

  if (args.length < 4) {
    throw new Error('Failed to execute \'openDatabase\': ' +
      '4 arguments required, but only ' + args.length + ' present');
  }

  var dbName = args[0];
  var dbVersion = args[1];

  // ignored
  //var dbDescription = args[2];
  //var dbSize = args[3];
  var callback = args[4] || noop;

  var db = dbNamesToDbs.get(dbName);

  if (!db) {
    db = createDb(dbName, dbVersion);
    dbNamesToDbs.set(dbName, db);
  }

  immediate(function () {
    callback(db);
  });

  return db;
}

module.exports = argsarray(openDatabase);