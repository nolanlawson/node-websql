'use strict';

var noop = require('noop-fn');
var Queue = require('tiny-queue');
var immediate = require('immediate');

var WebSQLResultSet = require('./WebSQLResultSet');

function errorUnhandled() {
  return true; // a non-truthy return indicates error was handled
}

function SQLTask(sql, sqlArgs, sqlCallback, sqlErrorCallback) {
  this.sql = sql;
  this.sqlArgs = sqlArgs;
  this.sqlCallback = sqlCallback;
  this.sqlErrorCallback = sqlErrorCallback;
}

function runSql(self, task) {
  var sql = task.sql;
  var sqlArgs = task.sqlArgs;
  var sqlCallback = task.sqlCallback;
  var sqlErrorCallback = task.sqlErrorCallback;

  function onQueryComplete(err, results) {
    if (err) {
      var errorResult = sqlErrorCallback(self, err);
      if (!!errorResult) { // user didn't handle the error
        self._error = err;
      }
    } else {
      sqlCallback(self, results);
    }
    self._running = false;
    runNextSql(self);
  }

  function runSelect() {
    self._websqlDatabase._db.all(sql, sqlArgs, function (err, rows) {
      if (err) {
        return onQueryComplete(err);
      }
      var insertId = void 0;
      var rowsAffected = 0;
      var resultSet = new WebSQLResultSet(insertId, rowsAffected, rows);
      onQueryComplete(null, resultSet);
    });
  }

  function runCreate() {
    self._websqlDatabase._db.run(sql, sqlArgs, function (err) {
      if (err) {
        return onQueryComplete(err);
      }
      // WebSQL always returns an insertId of 0 for "CREATE TABLE" statements
      var insertId = 0;
      var rowsAffected = 0;
      var rows = [];
      var resultSet = new WebSQLResultSet(insertId, rowsAffected, rows);
      onQueryComplete(null, resultSet);
    });
  }

  function runDrop() {
    self._websqlDatabase._db.run(sql, sqlArgs, function (err) {
      if (err) {
        return onQueryComplete(err);
      }
      // WebSQL always returns insertId=undefined and rowsAffected=0
      // for "DROP TABLE" statements. Go figure.
      var insertId = void 0;
      var rowsAffected = 0;
      var rows = [];
      var resultSet = new WebSQLResultSet(insertId, rowsAffected, rows);
      onQueryComplete(null, resultSet);
    });
  }

  function runInsert() {
    self._websqlDatabase._db.run(sql, sqlArgs, function (err) {
      if (err) {
        return onQueryComplete(err);
      }
      /* jshint validthis:true */
      var executionResult = this;
      var insertId = executionResult.lastID;
      var rowsAffected = executionResult.changes;
      var rows = [];
      var resultSet = new WebSQLResultSet(insertId, rowsAffected, rows);
      onQueryComplete(null, resultSet);
    });
  }

  function runUpdate() {
    self._websqlDatabase._db.run(sql, sqlArgs, function (err) {
      if (err) {
        return onQueryComplete(err);
      }
      /* jshint validthis:true */
      var executionResult = this;
      var insertId = void 0;
      var rowsAffected = executionResult.changes;
      var rows = [];
      var resultSet = new WebSQLResultSet(insertId, rowsAffected, rows);
      onQueryComplete(null, resultSet);
    });
  }

  // TODO: It seems like the sqlite3 API either allows:
  // 1) all(), which returns results but not rowsAffected or lastID
  // 2) run(), which doesn't return results, but returns rowsAffected and lastID
  // So we try to sniff whether it's a SELECT query or not.
  // This is inherently error-prone, although it will probably work in the 99%
  // case.
  var isSelect = /^\s*SELECT\b/i.test(sql);
  var isInsert = /^\s*INSERT\b/i.test(sql);
  var isCreate = /^\s*CREATE\s+TABLE\b/i.test(sql);
  var isDrop = /^\s*DROP\s+TABLE\b/i.test(sql);

  if (self._readOnly && !isSelect) {
    return immediate(function () {
      onQueryComplete(new Error('could not prepare statement (23 not authorized)'));
    });
  }

  if (isSelect) {
    runSelect();
  } else if (isInsert) {
    runInsert();
  } else if (isCreate) {
    runCreate();
  } else if (isDrop) {
    runDrop();
  } else {
    runUpdate();
  }
}

function runNextSql(self) {
  if (self._running) {
    return;
  }
  if (self._error) {
    return self._completeCallback(self._error);
  }
  var task = self._sqlQueue.shift();
  if (!task) {
    return self._completeCallback();
  }
  self._running = true;
  runSql(self, task);
}

function executeSql(self, sql, sqlArgs, sqlCallback, sqlErrorCallback) {
  self._sqlQueue.push(new SQLTask(sql, sqlArgs, sqlCallback, sqlErrorCallback));
  runNextSql(self);
}

function WebSQLTransaction(websqlDatabase, readOnly, completeCallback) {
  this._websqlDatabase = websqlDatabase;
  this._readOnly = readOnly;
  this._completeCallback = completeCallback;
  this._sqlQueue = new Queue();
  this._error = null;
}

WebSQLTransaction.prototype.executeSql = function (sql, sqlArgs, sqlCallback, sqlErrorCallback) {
  sqlArgs = Array.isArray(sqlArgs) ? sqlArgs : [];
  sqlCallback = typeof sqlCallback === 'function' ? sqlCallback : noop;
  sqlErrorCallback = typeof sqlErrorCallback === 'function' ? sqlErrorCallback : errorUnhandled;

  executeSql(this, sql, sqlArgs, sqlCallback, sqlErrorCallback);
};

WebSQLTransaction.prototype._checkDone = function () {
  runNextSql(this);
};

module.exports = WebSQLTransaction;