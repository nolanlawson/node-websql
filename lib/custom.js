'use strict';

var immediate = require('immediate');
var argsarray = require('argsarray');

var WebSQLDatabase = require('./websql/WebSQLDatabase');

function customOpenDatabase(SQLiteDatabase) {

  function createDb(dbName, dbVersion, callback) {
    var sqliteDatabase = new SQLiteDatabase(dbName);
    return new WebSQLDatabase(dbVersion, sqliteDatabase, callback);
  }

  function openDatabase(args) {

    if (args.length < 4) {
      throw new Error('Failed to execute \'openDatabase\': ' +
        '4 arguments required, but only ' + args.length + ' present');
    }

    var dbName = args[0];
    var dbVersion = args[1];
    // db description and size are ignored
    var callback = args[4];
    
    var db = createDb(dbName, dbVersion, function(db) {
      // We ignore the error (which is the second argument in this callback)
      // because we cannot synchronously query the database and throw a synchronous error,
      // even though per the WebSQL spec we should throw an INVALID_STATE_ERR here:
      // https://www.w3.org/TR/webdatabase/#dom-opendatabase)
      // This is noted in the "Limitations" section of the README.
      if (typeof callback === 'function') {
        immediate(function () {
          callback(db);
        });
      }
    });

    return db;
  }

  return argsarray(openDatabase);
}

module.exports = customOpenDatabase;