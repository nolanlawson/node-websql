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
      var db = openDatabase(':memory:');
    }));
  });
  it('throw error for openDatabase args < 3', function () {
    return expectError(Promise.resolve().then(function () {
      var db = openDatabase(':memory:', 'yolo');
    }));
  });

  it('throw error for openDatabase args < 4', function () {
    return expectError(Promise.resolve().then(function () {
      var db = openDatabase(':memory:', 'yolo', 'hey');
    }));
  });

  it('does a basic database operation', function () {
    var db = openDatabase(':memory:', '1.0', 'yolo', 100000);
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
    var db = openDatabase(':memory:', '1.0', 'yolo', 100000);
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
    var db = openDatabase(':memory:', '1.0', 'yolo', 100000);
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
    var db = openDatabase(':memory:', '1.0', 'yolo', 100000);
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
    var db = openDatabase(':memory:', '1.0', 'yolo', 100000);

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
    var db = openDatabase(':memory:', '1.0', 'yolo', 100000);

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
    var db = openDatabase(':memory:', '1.0', 'yolo', 100000);

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

  it('recovers from errors, returning undefined', function () {
    var db = openDatabase(':memory:', '1.0', 'yolo', 100000);

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
            });
          });
        });
      }, reject, resolve);
    }).then(function () {
      assert.equal(called, 3);
    });
  });

  it('doesn\'t recover if you return true', function () {
    var db = openDatabase(':memory:', '1.0', 'yolo', 100000);

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

  it('queries executed in right order', function () {
    var db = openDatabase(':memory:', '1.0', 'yolo', 100000);

    var called = [];

    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('SELECT 1 + 1', [], function () {
          called.push('a');
        });
        txn.executeSql('SELECT 1 + 1', [], function () {
          called.push('k');
        });
        txn.executeSql('SELECT 1 + 1', [], function () {
          called.push('b');
          txn.executeSql('SELECT 1 + 1', [], function () {
            called.push('l');
          });
          txn.executeSql('SELECT 1 + 1', [], function () {
            called.push('c');
            txn.executeSql('SELECT 1 + 1', [], function () {
              called.push('m');
            });
            txn.executeSql('SELECT 1 + 1', [], function () {
              called.push('n');
            });
            txn.executeSql('SELECT yolo from baz', [], function () {
            }, function () {
              called.push('e');
              txn.executeSql('SELECT 1 + 1', [], function () {
                called.push('f');
                txn.executeSql('SELECT yolo from baz', [], function () {
                }, function () {
                  called.push('h');
                  txn.executeSql('SELECT 1 + 1', [], function () {
                    called.push('g');
                  });
                });
                txn.executeSql('SELECT 1 + 1', [], function () {
                  called.push('o');
                });
              });
            });
            txn.executeSql('SELECT 1 + 1', [], function () {
              called.push('i');
            });
          });
          txn.executeSql('SELECT 1 + 1', [], function () {
            called.push('j');
          });
        });
      }, reject, resolve);
    }).then(function () {
      assert.deepEqual(called,
        ["a","k","b","l","c","j","m","n","e","i","f","h","o","g"]);
    });
  });

  it('has a version', function () {
    var db = openDatabase(':memory:', '1.0', 'yolo', 100000);
    assert.equal(db.version, '1.0');
  });

});

function transactionPromise(db, sql, sqlArgs) {
  return new Promise(function (resolve, reject) {
    var result;
    db.transaction(function (txn) {
      txn.executeSql(sql, sqlArgs, function (txn, res) {
        result = res;
      });
    }, reject, function () {
      resolve(result);
    });
  });
}

function getInsertId(res) {
  try {
    return res.insertId; // WebSQL will normally throw an error on access here
  } catch (err) {
    return void 0;
  }
}

describe('dedicated db test suite - in-memory', function () {
  this.timeout(30000);

  var db;

  beforeEach(function () {
    db = openDatabase(':memory:', '1.0', 'yolo', 100000);
  });

  afterEach(function () {
    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('DROP TABLE IF EXISTS table1');
        txn.executeSql('DROP TABLE IF EXISTS table2');
        txn.executeSql('DROP TABLE IF EXISTS table3');
      }, reject, resolve);
    }).then(function () {
      db = null;
    });
  });

  it('returns correct rowsAffected/insertId 1', function () {
    var sql = 'SELECT 1 + 1';
    return transactionPromise(db, sql).then(function (res) {
      assert.equal(getInsertId(res), void 0, 'no insertId');
      assert.equal(res.rowsAffected, 0, 'rowsAffected');
      assert.equal(res.rows.length, 1, 'rows.length');
    }).then(function () {
      var sql = 'SELECT 1 + 2';
      return transactionPromise(db, sql);
    }).then(function (res) {
      assert.equal(getInsertId(res), void 0, 'no insertId');
      assert.equal(res.rowsAffected, 0, 'rowsAffected');
      assert.equal(res.rows.length, 1, 'rows.length');
    });
  });

  it('returns correct rowsAffected/insertId 2', function () {
    var sql = 'CREATE TABLE table1 (text1 string, text2 string)';
    return transactionPromise(db, sql).then(function (res) {
      assert.equal(getInsertId(res), 0, 'insertId 1');
      assert.equal(res.rowsAffected, 0, '1 rowsAffected == ' + res.rowsAffected);
      assert.equal(res.rows.length, 0, 'rows.length');
    }).then(function () {
      var sql = 'INSERT INTO table1 VALUES ("foo", "bar")';
      return transactionPromise(db, sql);
    }).then(function (res) {
      assert.equal(getInsertId(res), 1, 'insertId 2');
      assert.equal(res.rowsAffected, 1, '2 rowsAffected == ' + res.rowsAffected);
      assert.equal(res.rows.length, 0, 'rows.length');
      var sql = 'SELECT * from table1';
      return transactionPromise(db, sql);
    }).then(function (res) {
      assert.equal(getInsertId(res), void 0, 'no insertId');
      assert.equal(res.rowsAffected, 0, '3 rowsAffected == ' + res.rowsAffected);
      assert.equal(res.rows.length, 1, 'rows.length');
      assert.deepEqual(res.rows[0], {
        text1: 'foo',
        text2: 'bar'
      });
    });
  });

  it('returns correct rowsAffected/insertId 3', function () {
    var sql = 'CREATE TABLE table1 (text1 string, text2 string)';
    return transactionPromise(db, sql).then(function (res) {
      assert.equal(getInsertId(res), 0, 'insertId');
      assert.equal(res.rowsAffected, 0, 'rowsAffected');
      assert.equal(res.rows.length, 0, 'rows.length');
    }).then(function () {
      var sql = 'INSERT INTO table1 VALUES ("baz", "quux")';
      return transactionPromise(db, sql);
    }).then(function (res) {
      assert.equal(getInsertId(res), 1, 'insertId');
      assert.equal(res.rowsAffected, 1, 'rowsAffected');
      assert.equal(res.rows.length, 0, 'rows.length');
      var sql = 'SELECT * from table1';
      return transactionPromise(db, sql);
    }).then(function (res) {
      assert.equal(getInsertId(res), void 0, 'no insertId');
      assert.equal(res.rowsAffected, 0, 'rowsAffected');
      assert.equal(res.rows.length, 1, 'rows.length');
      assert.deepEqual(res.rows[0], {
        text1: 'baz',
        text2: 'quux'
      });
    });
  });

  it('returns correct rowsAffected/insertId 4', function () {
    var sql = 'CREATE TABLE table1 (text1 string, text2 string)';
    return transactionPromise(db, sql).then(function (res) {
      assert.equal(getInsertId(res), 0, 'insertId');
      assert.equal(res.rowsAffected, 0, 'rowsAffected');
      assert.equal(res.rows.length, 0, 'rows.length');
    }).then(function () {
      var sql = 'INSERT INTO table1 VALUES ("baz", "quux")';
      return transactionPromise(db, sql);
    }).then(function (res) {
      assert.equal(getInsertId(res), 1, 'insertId');
      assert.equal(res.rowsAffected, 1, 'rowsAffected');
      assert.equal(res.rows.length, 0, 'rows.length');
      var sql = 'INSERT INTO table1 VALUES ("toto", "haha")';
      return transactionPromise(db, sql);
    }).then(function (res) {
      assert.equal(getInsertId(res), 2);
      assert.equal(res.rowsAffected, 1, 'rowsAffected');
      assert.equal(res.rows.length, 0, 'rows.length');
      var sql = 'UPDATE table1 SET text1 = "baz" WHERE text2 = "foobar";';
      return transactionPromise(db, sql);
    }).then(function (res) {
      assert.equal(getInsertId(res), void 0, 'no insertId 1');
      assert.equal(res.rowsAffected, 0, 'rowsAffected');
      assert.equal(res.rows.length, 0, 'rows.length');
      var sql = 'UPDATE table1 SET text1 = "bongo" WHERE text2 = "haha";';
      return transactionPromise(db, sql);
    }).then(function (res) {
      assert.equal(getInsertId(res), void 0);
      assert.equal(res.rowsAffected, 1, 'rowsAffected');
      assert.equal(res.rows.length, 0, 'rows.length');
      var sql = 'SELECT * from table1';
      return transactionPromise(db, sql);
    }).then(function (res) {
      assert.equal(getInsertId(res), void 0, 'no insertId 2');
      assert.equal(res.rowsAffected, 0, 'rowsAffected');
      assert.equal(res.rows.length, 2, 'rows.length');
      assert.deepEqual(res.rows[0], {
        text1: 'baz',
        text2: 'quux'
      });
      assert.deepEqual(res.rows[1], {
        text1: 'bongo',
        text2: 'haha'
      });
    });
  });

  it('returns correct rowsAffected/insertId 5', function () {
    var sql = 'CREATE TABLE table1 (text1 string, text2 string)';
    return transactionPromise(db, sql).then(function (res) {
      assert.equal(getInsertId(res), 0, 'insertId 1');
      assert.equal(res.rowsAffected, 0, 'rowsAffected');
      assert.equal(res.rows.length, 0, 'rows.length');
    }).then(function () {
      var sql = 'CREATE TABLE table2 (text1 string, text2 string)';
      return transactionPromise(db, sql);
    }).then(function (res) {
      assert.equal(getInsertId(res), 0, 'insertId 2');
      assert.equal(res.rowsAffected, 0, 'rowsAffected');
      assert.equal(res.rows.length, 0, 'rows.length');
      var sql = 'CREATE TABLE table3 (text1 string, text2 string)';
      return transactionPromise(db, sql);
    }).then(function (res) {
      assert.equal(getInsertId(res), 0, 'insertId 3');
      assert.equal(res.rowsAffected, 0, 'rowsAffected');
      assert.equal(res.rows.length, 0, 'rows.length');
    });
  });

});


describe('dedicated db test suite - actual DB', function () {

  this.timeout(30000);

  var db;

  beforeEach(function () {
    db = openDatabase('testdb', '1.0', 'yolo', 100000);
  });

  afterEach(function () {
    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('DROP TABLE IF EXISTS table1');
        txn.executeSql('DROP TABLE IF EXISTS table2');
        txn.executeSql('DROP TABLE IF EXISTS table3');
      }, reject, resolve);
    }).then(function () {
      db = null;
    });
  });


  it('stores data between two DBs', function () {
    var db1 = openDatabase('testdb', '1.0', 'yolo', 100000);
    var db2 = openDatabase('testdb', '1.0', 'yolo', 100000);

    return Promise.resolve().then(function () {
      var sql = 'CREATE TABLE table1 (text1 string, text2 string)';
      return transactionPromise(db1, sql);
    }).then(function () {
      var sql = 'INSERT INTO table1 VALUES ("foo", "bar")';
      return transactionPromise(db1, sql);
    }).then(function () {
      var sql = 'SELECT * from table1;';
      return transactionPromise(db1, sql);
    }).then(function (res) {
      assert.equal(getInsertId(res), void 0, 'no insertId');
      assert.equal(res.rowsAffected, 0, 'rowsAffected');
      assert.equal(res.rows.length, 1, 'rows.length');
      assert.deepEqual(res.rows[0], {
        text1: 'foo',
        text2: 'bar'
      });
      var sql = 'SELECT * from table1;';
      return transactionPromise(db2, sql);
    }).then(function (res) {
      assert.equal(getInsertId(res), void 0, 'no insertId');
      assert.equal(res.rowsAffected, 0, 'rowsAffected');
      assert.equal(res.rows.length, 1, 'rows.length');
      assert.deepEqual(res.rows[0], {
        text1: 'foo',
        text2: 'bar'
      });
    });
  });

});