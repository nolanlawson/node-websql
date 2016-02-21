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
    //console.log('onQueryComplete', err, results);
    if (err) {
      sqlErrorCallback(self, err);
    } else {
      sqlCallback(self, results);
    }
    self._running = false;
    runNextSql(self);
  }

  //console.log('executing', sql);
  self._websqlDatabase._db.all(sql, sqlArgs, function (err, rawResults) {
    //console.log('result', err, rawResults);
    var executionResult = this;

    if (err) {
      //console.log('got an error', err);
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
    return self._completeCallback();
  }
  self._running = true;
  runSql(self, task);
}

function WebSQLResultSet(executionResult, rawResults) {
  this.rows = rawResults;
  this.rowsAffected = executionResult.changes || 0;
}

function WebSQLTransaction(websqlDatabase, errorCallback, successCallback,
                           completeCallback) {
  this._websqlDatabase = websqlDatabase;
  this._errorCallback = errorCallback;
  this._successCallback = successCallback;
  this._completeCallback = completeCallback;
  this._sqlQueue = new Queue();
}

function executeSql(self, sql, sqlArgs, sqlCallback, sqlErrorCallback) {
  //console.log('executeSql', sql);
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