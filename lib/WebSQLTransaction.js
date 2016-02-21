'use strict';

var noop = require('noop-fn');
var Queue = require('tiny-queue');

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
      self._err = err;
      sqlErrorCallback(self, err);
    } else {
      sqlCallback(self, results);
    }
    self._running = false;
    runNextSql(self);
  }

  self._websqlDatabase._db.all(sql, sqlArgs, function (err, rawResults) {
    var executionResult = this;

    if (err) {
      return onQueryComplete(err);
    }
    var results = new WebSQLResultSet(executionResult, rawResults);
    onQueryComplete(null, results);
  });
}

function runNextSql(self) {
  if (self._running) {
    return;
  }
  var task = self._sqlQueue.shift();
  if (!task) {
    return self._completeCallback(self._err);
  }
  self._running = true;
  runSql(self, task);
}

function WebSQLResultSet(executionResult, rawResults) {
  this.rows = rawResults;
  this.rowsAffected = executionResult.changes || 0;
}

function WebSQLTransaction(websqlDatabase, completeCallback) {
  this._websqlDatabase = websqlDatabase;
  this._completeCallback = completeCallback;
  this._sqlQueue = new Queue();
}

function executeSql(self, sql, sqlArgs, sqlCallback, sqlErrorCallback) {
  self._sqlQueue.push(new SQLTask(sql, sqlArgs, sqlCallback, sqlErrorCallback));
  runNextSql(self);
}

WebSQLTransaction.prototype.executeSql = function (sql, sqlArgs, sqlCallback, sqlErrorCallback) {
  sqlArgs = Array.isArray(sqlArgs) ? sqlArgs : [];
  sqlCallback = typeof sqlCallback === 'function' ? sqlCallback : noop;
  sqlErrorCallback = typeof sqlErrorCallback === 'function' ? sqlErrorCallback : noop;

  executeSql(this, sql, sqlArgs, sqlCallback, sqlErrorCallback);
};

module.exports = WebSQLTransaction;