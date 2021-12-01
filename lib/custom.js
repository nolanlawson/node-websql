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
    
    var db = createDb(dbName, dbVersion, function(db, error) {
      if (error) {
        // WARNING: If the following is uncommented, an exception will be thrown 
        //  on an error AFTER the database object has already been returned!
        // throw error;
      }
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