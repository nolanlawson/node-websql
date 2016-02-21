'use strict';

var Promise = require('bluebird');
Promise.longStackTraces();
var assert = require('assert');
var arrayFrom = require('array-from');

var openDatabase;

if (!process.browser) {
  openDatabase = require('../'); // Node
} else {
  openDatabase = window.openDatabase.bind(window);
}

function expectError(promise) {
  return promise.then(function () {
    throw new Error('expected an error');
  }, function (err) {
    assert(err, 'error was thrown');
  });
}

describe('basic test suite', function () {

  this.timeout(2000);

  it('throw error for openDatabase args < 1', function () {
    return expectError(Promise.resolve().then(function () {
      var db = openDatabase();
    }));
  });
  it('throw error for openDatabase args < 2', function () {
    return expectError(Promise.resolve().then(function () {
      var db = openDatabase('testdb');
    }));
  });
  it('throw error for openDatabase args < 3', function () {
    return expectError(Promise.resolve().then(function () {
      var db = openDatabase('testdb', 'yolo');
    }));
  });

  it('throw error for openDatabase args < 4', function () {
    return expectError(Promise.resolve().then(function () {
      var db = openDatabase('testdb', 'yolo', 'hey');
    }));
  });

  it('does a basic database operation', function () {
    var db = openDatabase('testdb', '1.0', 'yolo', 100000);
    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('SELECT 1 + 1', [], function (txn, result) {
          resolve(result);
        }, function (txn, err) {
          reject(err);
        });
      });
    }).then(function (res) {
      assert.equal(res.rowsAffected, 0);
      assert.equal(res.rows.length, 1);
      assert.equal(res.rows[0]['1 + 1'], 2);
    });
  });

  it('handles an error', function () {
    var db = openDatabase('testdb', '1.0', 'yolo', 100000);
    return expectError(new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('SELECT foo FROM yolo', [], function (txn, result) {
          resolve(result);
        }, function (txn, err) {
          reject(err);
        });
      });
    }));
  });

  it('does multiple queries', function () {
    var db = openDatabase('testdb', '1.0', 'yolo', 100000);
    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('SELECT 1 + 1', [], function (txn, result) {
          resolve(result);
        }, function (txn, err) {
          reject(err);
        });
      });
    }).then(function (res) {
      assert.equal(res.rowsAffected, 0);
      assert.equal(res.rows.length, 1);
      assert.equal(res.rows[0]['1 + 1'], 2);

      return new Promise(function (resolve, reject) {
        db.transaction(function (txn) {
          txn.executeSql('SELECT 2 + 1', [], function (txn, result) {
            resolve(result);
          }, function (txn, err) {
            reject(err);
          });
        });
      });
    }).then(function (res) {
      assert.equal(res.rowsAffected, 0);
      assert.equal(res.rows.length, 1);
      assert.equal(res.rows[0]['2 + 1'], 3);
    });
  });

  it('does multiple queries, same event loop', function () {
    var db = openDatabase('testdb', '1.0', 'yolo', 100000);
    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        var results = new Array(2);
        var done = 0;
        function checkDone() {
          if (++done === 2) {
            resolve(results);
          }
        }

        txn.executeSql('SELECT 1 + 1', [], function (txn, result) {
          results[0] = result;
          checkDone();
        }, function (txn, err) {
          reject(err);
        });

        txn.executeSql('SELECT 2 + 1', [], function (txn, result) {
          results[1] = result;
          checkDone();
        }, function (txn, err) {
          reject(err);
        });

      });
    }).then(function (results) {
      assert.equal(results[0].rowsAffected, 0);
      assert.equal(results[0].rows.length, 1);
      assert.equal(results[0].rows[0]['1 + 1'], 2);

      assert.equal(results[1].rowsAffected, 0);
      assert.equal(results[1].rows.length, 1);
      assert.equal(results[1].rows[0]['2 + 1'], 3);
    });
  });
  
  it('calls transaction complete callback', function () {
    var db = openDatabase('testdb', '1.0', 'yolo', 100000);

    var called = 0;

    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('SELECT 1 + 1', [], function () {
          called++;
        });
        txn.executeSql('SELECT 1 + 1', [], function () {
          called++;
          txn.executeSql('SELECT 1 + 1', [], function () {
            called++;
            txn.executeSql('SELECT 1 + 1', [], function () {
              called++;
            });
          });
        });
      }, reject, resolve);
    }).then(function () {
      assert.equal(called, 4);
    });
  });

  it('calls transaction error callback', function () {
    var db = openDatabase('testdb', '1.0', 'yolo', 100000);

    var called = 0;

    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('SELECT 1 + 1', [], function () {
          called++;
        });
        txn.executeSql('SELECT 1 + 1', [], function () {
          called++;
          txn.executeSql('SELECT 1 + 1', [], function () {
            called++;
            txn.executeSql('SELECT yolo from baz', [], function () {
              called++;
            });
          });
        });
      }, function (err) {
        if (!err) {
          return reject(new Error('expected an error here'));
        }
        resolve();
      }, reject);
    }).then(function () {
      assert.equal(called, 3);
    });
  });

  it('recovers from errors', function () {
    var db = openDatabase('testdb', '1.0', 'yolo', 100000);

    var called = 0;

    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('SELECT 1 + 1', [], function () {
          called++;
        });
        txn.executeSql('SELECT 1 + 1', [], function () {
          called++;
          txn.executeSql('SELECT 1 + 1', [], function () {
            called++;
            txn.executeSql('SELECT yolo from baz', [], function () {
              called++;
            }, function (err) {
              if (!err) {
                return reject(new Error('expected an error here'));
              }
              return false; // ack that the error was handled
            });
          });
        });
      }, reject, resolve);
    }).then(function () {
      assert.equal(called, 3);
    });
  });

  it('doesn\'t recover if you return true', function () {
    var db = openDatabase('testdb', '1.0', 'yolo', 100000);

    var called = 0;

    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('SELECT 1 + 1', [], function () {
          called++;
        });
        txn.executeSql('SELECT 1 + 1', [], function () {
          called++;
          txn.executeSql('SELECT 1 + 1', [], function () {
            called++;
            txn.executeSql('SELECT yolo from baz', [], function () {
              called++;
            }, function (err) {
              if (!err) {
                return reject(new Error('expected an error here'));
              }
              return true;
            });
          });
        });
      }, function (err) {
        if (!err) {
          return reject(new Error('expected an error here'));
        }
        resolve();
      }, reject);
    }).then(function () {
      assert.equal(called, 3);
    });
  });

});

describe('dedicated db test suite', function () {

  this.timeout(10000);

});