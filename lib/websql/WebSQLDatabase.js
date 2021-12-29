'use strict';

var Queue = require('tiny-queue');
var immediate = require('immediate');
var noop = require('noop-fn');
var inherits = require('inherits');

var WebSQLTransaction = require('./WebSQLTransaction');

var ROLLBACK = [
  {sql: 'ROLLBACK;', args: []}
];

var COMMIT = [
  {sql: 'END;', args: []}
];

var createInfoTable = {
  sql: 'CREATE TABLE IF NOT EXISTS __WebKitDatabaseInfoTable__ ' +
    '(key TEXT NOT NULL UNIQUE ON CONFLICT REPLACE,' +
    'value TEXT NOT NULL)',
  args: []
};
var getVersion = {
  sql: 'SELECT value FROM __WebKitDatabaseInfoTable__ ' +
    'WHERE key="WebKitDatabaseVersionKey";',
  args: []
};
var setVersionSql = 'INSERT OR REPLACE INTO __WebKitDatabaseInfoTable__ (key, value)' +
    ' values ("WebKitDatabaseVersionKey", ?)';

function InvalidStateError(message) {
  this.name = 'InvalidStateError';
  this.message = message;
  this.code = 11;
  // via https://stackoverflow.com/a/27925672
  if (typeof Error.captureStackTrace === 'function') {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = (new Error()).stack;
  }
}
inherits(InvalidStateError, Error); // extend the Error object

function SQLVersionError(message) {
  this.name = 'SQLVersionError';
  this.message = message;
  this.code = 2;
  // via https://stackoverflow.com/a/27925672
  if (typeof Error.captureStackTrace === 'function') {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = (new Error()).stack;
  }
}
inherits(SQLVersionError, Error); // extend the Error object

// v8 likes predictable objects
function TransactionTask(readOnly, txnCallback, errorCallback, successCallback) {
  this.readOnly = readOnly;
  this.txnCallback = txnCallback;
  this.errorCallback = errorCallback;
  this.successCallback = successCallback;
}

function WebSQLDatabase(dbVersion, db, callback) {
  var self = this;
  self.version = dbVersion;
  self._db = db;
  self._txnQueue = new Queue();
  self._running = false;
  self._currentTask = null;
  self._callback = callback;

  self._db.exec([createInfoTable], false, function (error) {
    /* istanbul ignore next */
    if (error) {
      return self._callback(null, error);
    }
    self._db.exec([getVersion], true, function (error, res) {
      /* istanbul ignore next */
      if (error) {
        return self._callback(null, error);
      }
      if (res[0].rows.length === 1) {
        var currentVersion = res[0].rows[0].value;
        if (self.version !== '' && self.version !== currentVersion) {
          return self._callback(null, new InvalidStateError(
            'unable to open database, version mismatch, \'' + 
            self.version + '\' does not match the currentVersion of \'' +
            currentVersion + '\''));
        } else {
          self.version = currentVersion;
          self._callback(self);
        }
      } else {
        var setVer = {
          sql: setVersionSql,
          args: [self.version]
        };
        
        self._db.exec([setVer], false, function (error) {
          /* istanbul ignore if */
          if (error) {
            return self._callback(null, error);
          }
          self._callback(self);
        });
      }
    });
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
  /* istanbul ignore next */
  errorCallback = errorCallback || noop;
  /* istanbul ignore next */
  successCallback = successCallback || noop;
  self.transaction(function (tx) {
    tx.executeSql(getVersion.sql, getVersion.args, function (tx, res) {
      // Check existing verion
      /* istanbul ignore next */
      if (res.rows.length === 1) {
        var currentVersion = res.rows.item(0).value;
        if (oldVersion !== currentVersion) {
          return errorCallback(tx, new SQLVersionError(
            'current version of the database and `oldVersion` argument do not match'));
        }
      }

      function updateVersion() {
        self.transaction(function (tx) {
          tx.executeSql(setVersionSql, [newVersion], function () {
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