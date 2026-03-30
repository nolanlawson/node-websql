'use strict';

// var sqlite3 = require('sqlite3');
const { DatabaseSync } = require('node:sqlite')

var SQLiteResult = require('./SQLiteResult');

var READ_ONLY_ERROR = new Error(
  'could not prepare statement (23 not authorized)');

function SQLiteDatabase(name) {
//  console.log('init sqlite')
  // this._db = new sqlite3.Database(name);
  this._db = new DatabaseSync(name);
}

function runSelect(db, sql, args = []) {
  try {
    const stmt = db.prepare(sql)
    const result = stmt.all(...args)
    var insertId = void 0;
    var rowsAffected = 0;
    var resultSet = new SQLiteResult(null, insertId, rowsAffected, result);
//    console.log({sql, args, stmt, result, resultSet})
    return resultSet;
  } catch (err) {
    return new SQLiteResult(err);
  }
}

function runNonSelect(db, sql, args) {
  try {
    const stmt = db.prepare(sql)
    const result = stmt.run(...args)
    var insertId = result.lastInsertRowid;
    var rowsAffected = result.changes;
    var rows = [];
    var resultSet = new SQLiteResult(null, insertId, rowsAffected, rows);
//    console.log({sql, args, stmt, result, resultSet})
    return resultSet;
  } catch (err) {
//    console.log({sql, args, err})
    return new SQLiteResult(err);
  }
}

SQLiteDatabase.prototype.exec = function exec(queries, readOnly, callback) {
//  console.log({queries})

  var db = this._db;
  var len = queries.length;
  var results = new Array(len);

  for(let i = 0; i < len; i++) { 
    var query = queries[i];
//    console.log(query)
    var sql = query.sql;
    var args = query.args;

    // TODO: It seems like the node-sqlite3 API either allows:
    // 1) all(), which returns results but not rowsAffected or lastID
    // 2) run(), which doesn't return results, but returns rowsAffected and lastID
    // So we try to sniff whether it's a SELECT query or not.
    // This is inherently error-prone, although it will probably work in the 99%
    // case.
    var isSelect = /^\s*SELECT\b/i.test(sql);

    if (readOnly && !isSelect) {
      results[i] = new SQLiteResult(READ_ONLY_ERROR);
    } else if (isSelect) {
      results[i] = runSelect(db, sql, args);
    } else {
      results[i] = runNonSelect(db, sql, args);
    }
  }
//  console.log(JSON.stringify({results}))

  callback(null, results)
// 
//   function checkDone() {
//     if (++i === len) {
//       callback(null, results);
//     } else {
//       doNext();
//     }
//   }
// 
//   function onQueryComplete(i) {
//     return function (res) {
//       results[i] = res;
//       checkDone();
//     };
//   }
// 
//   function doNext() {
//     var query = queries[i];
////     console.log(query)
//     var sql = query.sql;
//     var args = query.args;
// 
//     // TODO: It seems like the node-sqlite3 API either allows:
//     // 1) all(), which returns results but not rowsAffected or lastID
//     // 2) run(), which doesn't return results, but returns rowsAffected and lastID
//     // So we try to sniff whether it's a SELECT query or not.
//     // This is inherently error-prone, although it will probably work in the 99%
//     // case.
//     var isSelect = /^\s*SELECT\b/i.test(sql);
// 
//     if (readOnly && !isSelect) {
//       onQueryComplete(i)(new SQLiteResult(READ_ONLY_ERROR));
//     } else if (isSelect) {
//       runSelect(db, sql, args, onQueryComplete(i));
//     } else {
//       runNonSelect(db, sql, args, onQueryComplete(i));
//     }
//   }

  // doNext();
};

module.exports = SQLiteDatabase;