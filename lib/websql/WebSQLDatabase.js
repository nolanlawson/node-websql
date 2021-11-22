'use strict';

var Queue = require('tiny-queue');
var immediate = require('immediate');
var noop = require('noop-fn');

var WebSQLTransaction = require('./WebSQLTransaction');

var ROLLBACK = [
  {sql: 'ROLLBACK;', args: []}
];

var COMMIT = [
  {sql: 'END;', args: []}
];

var createInfoTable = {
  sql: 'CREATE TABLE IF NOT EXISTS __WebKitDatabaseInfoTable__ ' +
    '(key TEXT NOT NULL ON CONFLICT FAIL UNIQUE ON CONFLICT REPLACE,' +
    'value TEXT NOT NULL ON CONFLICT FAIL)',
  args: []
};
var getVersion = {
  sql: 'SELECT value FROM __WebKitDatabaseInfoTable__ WHERE key="WebKitDatabaseVersionKey";',
  args: []
};   
var setVersion = {
  sql: 'INSERT OR REPLACE INTO __WebKitDatabaseInfoTable__ (key, value)' +
    ' values ("WebKitDatabaseVersionKey", ?)',
  args: []
};

// v8 likes predictable objects
function TransactionTask(readOnly, txnCallback, errorCallback, successCallback) {
  this.readOnly = readOnly;
  this.txnCallback = txnCallback;
  this.errorCallback = errorCallback;
  this.successCallback = successCallback;
}

function WebSQLDatabase(dbVersion, db) {
  var self = this;
  self.version = dbVersion;
  self._db = db;
  self._txnQueue = new Queue();
  self._running = false;
  self._currentTask = null;

  function onError(tx, error) {
    throw error;
  }

  self.transaction(function(tx){
    tx.executeSql(createInfoTable.sql, createInfoTable.args, function (tx) {
      tx.executeSql(getVersion.sql, getVersion.args, function (tx, res) {
        if (res.rows.length === 1) {
          var currentVersion = res.rows.item(0).value;
          if (self.version !== '' && self.version !== currentVersion) {
            onError(tx, { 
              code: 2,
              message: 'The operation failed because the actual ' +
                'database version was not what it should be.'
            });
          } else {
            self.version = currentVersion;
          }
        }
        else {
          var setVer = setVersion;
          setVer.args = [self.version];
          tx.executeSql(setVer.sql, setVer.args, null, onError);
        }
      }, onError);
    }, onError);
  });
}

WebSQLDatabase.prototype._onTransactionComplete = function(err) {
  var self = this;

  function done(error) {
    if (error) {
      self._currentTask.errorCallback(error);
    } else {
      self._currentTask.successCallback();
    }
    self._running = false;
    self._currentTask = null;
    self._runNextTransaction();
  }

  function rollbackDone(error) {
    // Ignoring ROLLBACK errors as per
    // https://www.sqlite.org/lang_transaction.html#response_to_errors_within_a_transaction
    return function() {
      done(error);
    };
  }

  function findErrorInResults(results) {
    for (var i = 0; i < results.length; i++) {
      var result = results[i];
      if (result.error) {
        return result.error;
      }
    }
  }

  function commitDone(commitError, results) {
    var error = commitError || findErrorInResults(results) || null;
    if (error) {
      // Explicit ROLLBACK on failed COMMIT as per
      // https://www.sqlite.org/lang_transaction.html#response_to_errors_within_a_transaction
      self._db.exec(ROLLBACK, false, rollbackDone(error));
    } else {
      done();
    }
  }

  if (self._currentTask.readOnly) {
    done(err); // read-only doesn't require a transaction
  } else if (err) {
    self._db.exec(ROLLBACK, false, rollbackDone(err));
  } else {
    self._db.exec(COMMIT, false, commitDone);
  }
};

WebSQLDatabase.prototype._runTransaction = function () {
  var self = this;
  var txn = new WebSQLTransaction(self);

  immediate(function () {
    self._currentTask.txnCallback(txn);
    txn._checkDone();
  });
};

WebSQLDatabase.prototype._runNextTransaction = function() {
  if (this._running) {
    return;
  }
  var task = this._txnQueue.shift();

  if (!task) {
    return;
  }

  this._currentTask = task;
  this._running = true;
  this._runTransaction();
};

WebSQLDatabase.prototype._createTransaction = function(
    readOnly, txnCallback, errorCallback, successCallback) {
  errorCallback = errorCallback || noop;
  successCallback = successCallback || noop;

  if (typeof txnCallback !== 'function') {
    throw new Error('The callback provided as parameter 1 is not a function.');
  }

  this._txnQueue.push(new TransactionTask(readOnly, txnCallback, errorCallback, successCallback));
  this._runNextTransaction();
};

WebSQLDatabase.prototype.transaction = function (txnCallback, errorCallback, successCallback) {
  this._createTransaction(false, txnCallback, errorCallback, successCallback);
};

WebSQLDatabase.prototype.readTransaction = function (txnCallback, errorCallback, successCallback) {
  this._createTransaction(true, txnCallback, errorCallback, successCallback);
};

WebSQLDatabase.prototype.changeVersion = 
  function (oldVersion, newVersion, txnCallback, errorCallback, successCallback) {
  var self = this;
  errorCallback = errorCallback || noop;
  successCallback = successCallback || noop;
  self.transaction(function (tx) {
    tx.executeSql(getVersion.sql, getVersion.args, function (tx, res) {
      // Check existing verion
      if (res.rows.length === 1) {
        var currentVersion = res.rows.item(0).value;
        if (oldVersion !== currentVersion) {
          return errorCallback(tx, { 
            code: 2,
            message: 'The operation failed because the actual ' +
              'database version was not what it should be.'});
        }
      }

      function updateVersion() {
        self.transaction(function (tx) {
          var setVer = setVersion;
          setVer.args = [newVersion];
          tx.executeSql(setVer.sql, setVer.args, function () {
            self.version = newVersion;
            successCallback();
          }, errorCallback);
        }, errorCallback);
      }
    
      if (typeof txnCallback === 'function') {
        self.transaction(txnCallback, errorCallback, updateVersion);
      }
      else {
        updateVersion();
      }
    }, errorCallback);
  });
};

module.exports = WebSQLDatabase;