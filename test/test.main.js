'use strict';

var Promise = require('bluebird');
Promise.longStackTraces();
var assert = require('assert');

/*jshint -W079 */
var openDatabase = require('../');

function expectError(promise) {
  return promise.then(function () {
    throw new Error('expected an error');
  }, function (err) {
    assert(err, 'error was thrown');
  });
}

describe('basic test suite', function () {

  this.timeout(60000);

  it('throw error for openDatabase args < 1', function () {
    return expectError(Promise.resolve().then(function () {
      openDatabase();
    }));
  });
  it('throw error for openDatabase args < 2', function () {
    return expectError(Promise.resolve().then(function () {
      openDatabase(':memory:');
    }));
  });
  it('throw error for openDatabase args < 3', function () {
    return expectError(Promise.resolve().then(function () {
      openDatabase(':memory:', 'yolo');
    }));
  });

  it('throw error for openDatabase args < 4', function () {
    return expectError(Promise.resolve().then(function () {
      openDatabase(':memory:', 'yolo', 'hey');
    }));
  });

  it('does a basic database operation', function () {
    var db = openDatabase(':memory:', '1.0', 'yolo', 100000);
    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('SELECT 1 + 1', [], function (_txn, result) {
          resolve(result);
        }, function (_txn, err) {
          reject(err);
        });
      });
    }).then(function (res) {
      assert.equal(res.rowsAffected, 0);
      assert.equal(res.rows.length, 1);
      assert.equal(res.rows.item(0)['1 + 1'], 2);
    });
  });

  it('Sets initial version number', function () {
    var ver = '1.0';
    return new Promise(function (resolve) {
      openDatabase(':memory:', ver, 'yolo', 100000, function (db) {
        resolve(assert.equal(db.version, ver));
      });
    });
  });

  it('Change version number without callback', function () {
    var oldver = '1.0';
    var newver = '2.0';
    return new Promise(function (resolve, reject) {
      openDatabase(':memory:', oldver, 'yolo', 100000, function (db) {
        db.changeVersion(oldver, newver, null, reject, function () {
          resolve(assert.equal(db.version, newver));
        });
      });
    });
  });

  it('Change version number with callback', function () {
    var oldver = '1.0';
    var newver = '2.0';
    return new Promise(function (resolve, reject) {
      openDatabase(':memory:', oldver, 'yolo', 100000, function (db) {
        db.changeVersion(oldver, newver, function () {
          assert.equal(db.version, oldver);
        }, reject, function () {
          resolve(assert.equal(db.version, newver));
        });
      });
    });
  });

  it('handles an error - open database', function () {
    var oldver = '1.0';
    var newver = '2.0';
    openDatabase('testdb', oldver, 'yolo', 100000, function () {
      try {
        openDatabase('testdb', newver, 'yolo', 100000);
      }
      catch (e) {
        assert.ok(e);
      }
    });
  });

  it('handles an error - change version number', function () {
    var oldver = '1.0';
    var newver = '2.0';
    return expectError(new Promise(function (resolve, reject) {
      openDatabase(':memory:', oldver, 'yolo', 100000, function(db) {
        db.changeVersion(newver, newver, null, function(_tx, error) {
          reject(error);
        }, function () {
          resolve();
        });
      });
    }));
  });

  it('handles an error - select', function () {
    var db = openDatabase(':memory:', '1.0', 'yolo', 100000);
    return expectError(new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('SELECT foo FROM yolo', [], function (_txn, result) {
          resolve(result);
        }, function (_txn, err) {
          reject(err);
        });
      });
    }));
  });

  it('handles an error - drop', function () {
    var db = openDatabase(':memory:', '1.0', 'yolo', 100000);
    return expectError(new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('DROP TABLE blargy blah', [], function (_txn, result) {
          resolve(result);
        }, function (_txn, err) {
          reject(err);
        });
      });
    }));
  });

  it('handles an error - delete', function () {
    var db = openDatabase(':memory:', '1.0', 'yolo', 100000);
    return expectError(new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('DELETE FROM yolo', [], function (_txn, result) {
          resolve(result);
        }, function (_txn, err) {
          reject(err);
        });
      });
    }));
  });

  it('handles an error - create', function () {
    var db = openDatabase(':memory:', '1.0', 'yolo', 100000);
    return expectError(new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('CREATE TABLE blargy blah', [], function (_txn, result) {
          resolve(result);
        }, function (_txn, err) {
          reject(err);
        });
      });
    }));
  });

  it('handles an error - insert', function () {
    var db = openDatabase(':memory:', '1.0', 'yolo', 100000);
    return expectError(new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('INSERT INTO blargy blah', [], function (_txn, result) {
          resolve(result);
        }, function (_txn, err) {
          reject(err);
        });
      });
    }));
  });

  it('does multiple queries', function () {
    var db = openDatabase(':memory:', '1.0', 'yolo', 100000);
    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('SELECT 1 + 1', [], function (_txn, result) {
          resolve(result);
        }, function (_txn, err) {
          reject(err);
        });
      });
    }).then(function (res) {
      assert.equal(res.rowsAffected, 0);
      assert.equal(res.rows.length, 1);
      assert.equal(res.rows.item(0)['1 + 1'], 2);

      return new Promise(function (resolve, reject) {
        db.transaction(function (txn) {
          txn.executeSql('SELECT 2 + 1', [], function (_txn, result) {
            resolve(result);
          }, function (_txn, err) {
            reject(err);
          });
        });
      });
    }).then(function (res) {
      assert.equal(res.rowsAffected, 0);
      assert.equal(res.rows.length, 1);
      assert.equal(res.rows.item(0)['2 + 1'], 3);
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

        txn.executeSql('SELECT 1 + 1', [], function (_txn, result) {
          results[0] = result;
          checkDone();
        }, function (_txn, err) {
          reject(err);
        });

        txn.executeSql('SELECT 2 + 1', [], function (_txn, result) {
          results[1] = result;
          checkDone();
        }, function (_txn, err) {
          reject(err);
        });

      });
    }).then(function (results) {
      assert.equal(results[0].rowsAffected, 0);
      assert.equal(results[0].rows.length, 1);
      assert.equal(results[0].rows.item(0)['1 + 1'], 2);

      assert.equal(results[1].rowsAffected, 0);
      assert.equal(results[1].rows.length, 1);
      assert.equal(results[1].rows.item(0)['2 + 1'], 3);
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

  it('calls transaction complete callback - empty txn', function () {
    var db = openDatabase(':memory:', '1.0', 'yolo', 100000);

    var called = 0;

    return new Promise(function (resolve, reject) {
      db.transaction(function () {
      }, reject, resolve);
    }).then(function () {
      assert.equal(called, 0);
    });
  });

  it('calls transaction complete callback - null txn', function () {
    var db = openDatabase(':memory:', '1.0', 'yolo', 100000);

    return expectError(new Promise(function (resolve, reject) {
      try {
        db.transaction(null, reject, resolve);
      } catch (err) {
        reject(err);
      }
    }));
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

  it('calls error callback when COMMIT throws an exception', function () {
    var db = openDatabase(':memory:', '1.0', 'yolo', 100000);

    var called = 0;

    return new Promise(function (resolve, reject) {
      db._db.exec(
        [{ sql: 'PRAGMA foreign_keys = ON', args: []}],
        false,
        function () {
          db.transaction(function (txn) {
            txn.executeSql('CREATE TABLE foo (id integer primary key)', [], function () {
              called++;
              txn.executeSql('INSERT INTO foo (id) VALUES (1)', [], function () {
                called++;
		var sql = 'CREATE TABLE qux (foo integer NOT NULL REFERENCES ' +
	                  'foo (id) DEFERRABLE INITIALLY DEFERRED)';
                txn.executeSql(sql, [], function () {
                  called++;
                });
              });
            });
          }, reject, function() {
            assert.equal(called, 3);
          });

          db.transaction(function (txn) {
            txn.executeSql('INSERT INTO qux (foo) VALUES (2)', [], function () {
              called++;
            });
          }, function (err) {
            assert.equal(called, 4);
            assert.equal(err.message, "SQLITE_CONSTRAINT: FOREIGN KEY constraint failed");
          }, reject);

          db.transaction(function (txn) {
            txn.executeSql('SELECT * FROM qux', [], function (_txn, res) {
              called++;
              assert.equal(res.rows.length, 0);
            });
          }, reject, function () {
            assert.equal(called, 5);
            resolve();
          });
        }
      );
    });
  });

});

function transactionPromise(db, sql, sqlArgs) {
  return new Promise(function (resolve, reject) {
    var result;
    db.transaction(function (txn) {
      txn.executeSql(sql, sqlArgs, function (_txn, res) {
        result = res;
      });
    }, reject, function () {
      resolve(result);
    });
  });
}

function readTransactionPromise(db, sql, sqlArgs) {
  return new Promise(function (resolve, reject) {
    var result;
    db.readTransaction(function (txn) {
      txn.executeSql(sql, sqlArgs, function (_txn, res) {
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
  this.timeout(60000);

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
      assert.deepEqual(res.rows.item(0), {
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
      assert.deepEqual(res.rows.item(0), {
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
      assert.deepEqual(res.rows.item(0), {
        text1: 'baz',
        text2: 'quux'
      });
      assert.deepEqual(res.rows.item(1), {
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

  it('returns correct rowsAffected/insertId - delete', function () {
    var sql = 'CREATE TABLE table1 (text1 string, text2 string)';
    return transactionPromise(db, sql).then(function () {
    }).then(function () {
      var sql = 'DELETE FROM table1';
      return transactionPromise(db, sql);
    }).then(function (res) {
      assert.equal(getInsertId(res), void 0);
      assert.equal(res.rowsAffected, 0);
      assert.equal(res.rows.length, 0);
      var sql = 'INSERT INTO table1 VALUES ("toto", "haha")';
      return transactionPromise(db, sql);
    }).then(function () {
      var sql = 'DELETE FROM table1';
      return transactionPromise(db, sql);
    }).then(function (res) {
      assert.equal(getInsertId(res), void 0);
      assert.equal(res.rowsAffected, 1);
      assert.equal(res.rows.length, 0);
    });
  });

  it('returns correct rowsAffected/insertId - delete 2', function () {
    var sql = 'CREATE TABLE table1 (text1 string, text2 string)';
    return transactionPromise(db, sql).then(function () {
    }).then(function () {
      var sql = 'DELETE FROM table1';
      return transactionPromise(db, sql);
    }).then(function (res) {
      assert.equal(getInsertId(res), void 0);
      assert.equal(res.rowsAffected, 0);
      assert.equal(res.rows.length, 0);
      var sql = 'INSERT INTO table1 VALUES ("toto", "haha")';
      return transactionPromise(db, sql);
    }).then(function () {
      var sql = 'INSERT INTO table1 VALUES ("baz", "bar")';
      return transactionPromise(db, sql);
    }).then(function () {
      var sql = 'DELETE FROM table1';
      return transactionPromise(db, sql);
    }).then(function (res) {
      assert.equal(getInsertId(res), void 0);
      assert.equal(res.rowsAffected, 2);
      assert.equal(res.rows.length, 0);
    });
  });

  it('returns correct rowsAffected/insertId - drop 1', function () {
    var sql = 'CREATE TABLE table1 (text1 string, text2 string)';
    return transactionPromise(db, sql).then(function () {
    }).then(function () {
      var sql = 'DROP TABLE table1';
      return transactionPromise(db, sql);
    }).then(function (res) {
      assert.equal(getInsertId(res), void 0);
      assert.equal(res.rowsAffected, 0);
      assert.equal(res.rows.length, 0);
    });
  });

  it('returns correct rowsAffected/insertId - drop 2', function () {
    var sql = 'CREATE TABLE table1 (text1 string, text2 string)';
    return transactionPromise(db, sql).then(function () {
    }).then(function () {
      var sql = 'INSERT INTO table1 VALUES ("toto", "haha")';
      return transactionPromise(db, sql);
    }).then(function () {
      var sql = 'DROP TABLE table1';
      return transactionPromise(db, sql);
    }).then(function (res) {
      assert.equal(getInsertId(res), void 0);
      assert.equal(res.rowsAffected, 0);
      assert.equal(res.rows.length, 0);
    });
  });

  it('returns correct rowsAffected/insertId - drop 3', function () {
    var sql = 'CREATE TABLE table1 (text1 string, text2 string)';
    return transactionPromise(db, sql).then(function () {
    }).then(function () {
      var sql = 'INSERT INTO table1 VALUES ("toto", "haha")';
      return transactionPromise(db, sql);
    }).then(function () {
      var sql = 'INSERT INTO table1 VALUES ("baz", "bar")';
      return transactionPromise(db, sql);
    }).then(function () {
      var sql = 'DROP TABLE table1';
      return transactionPromise(db, sql);
    }).then(function (res) {
      assert.equal(getInsertId(res), void 0);
      assert.equal(res.rowsAffected, 0);
      assert.equal(res.rows.length, 0);
    });
  });

  it('valid read transaction', function () {
    var sql = 'CREATE TABLE table1 (text1 string, text2 string)';
    return transactionPromise(db, sql).then(function () {
    }).then(function () {
      var sql = 'INSERT INTO table1 VALUES ("toto", "haha")';
      return transactionPromise(db, sql);
    }).then(function () {
      var sql = 'SELECT * from table1';
      return readTransactionPromise(db, sql);
    }).then(function (res) {
      assert.equal(getInsertId(res), void 0, 'no insertId 2');
      assert.equal(res.rowsAffected, 0, 'rowsAffected');
      assert.equal(res.rows.length, 1, 'rows.length');
      assert.deepEqual(res.rows.item(0), {
        text1: 'toto',
        text2: 'haha'
      });
    });
  });

  it('throws error for writes during read-only transaction', function () {
    var sql = 'CREATE TABLE table1 (text1 string, text2 string)';
    return transactionPromise(db, sql).then(function () {
    }).then(function () {
      var sql = 'INSERT INTO table1 VALUES ("toto", "haha")';
      return transactionPromise(db, sql);
    }).then(function () {
      var sql = 'INSERT INTO table1 VALUES ("quux", "haha")';
      return expectError(readTransactionPromise(db, sql));
    });
  });

  it('query ignored for invalid read-only transaction write', function () {
    var sql = 'CREATE TABLE table1 (text1 string, text2 string)';
    return transactionPromise(db, sql).then(function () {
    }).then(function () {
      var sql = 'INSERT INTO table1 VALUES ("toto", "haha")';
      return transactionPromise(db, sql);
    }).then(function () {
      var sql = 'INSERT INTO table1 VALUES ("quux", "haha")';
      return expectError(readTransactionPromise(db, sql));
    }).then(function () {
      var sql = 'SELECT * from table1';
      return readTransactionPromise(db, sql);
    }).then(function (res) {
      assert.equal(getInsertId(res), void 0, 'no insertId 2');
      assert.equal(res.rowsAffected, 0, 'rowsAffected');
      assert.equal(res.rows.length, 1, 'rows.length');
      assert.deepEqual(res.rows.item(0), {
        text1: 'toto',
        text2: 'haha'
      });
    });
  });
});

describe('dedicated db test suite - actual DB', function () {

  this.timeout(60000);

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
      assert.deepEqual(res.rows.item(0), {
        text1: 'foo',
        text2: 'bar'
      });
      var sql = 'SELECT * from table1;';
      return transactionPromise(db2, sql);
    }).then(function (res) {
      assert.equal(getInsertId(res), void 0, 'no insertId');
      assert.equal(res.rowsAffected, 0, 'rowsAffected');
      assert.equal(res.rows.length, 1, 'rows.length');
      assert.deepEqual(res.rows.item(0), {
        text1: 'foo',
        text2: 'bar'
      });
    });
  });
});

describe('advanced test suite - actual DB', function () {

  this.timeout(60000);

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
        txn.executeSql('DROP TABLE IF EXISTS foo');
        txn.executeSql('DROP TABLE IF EXISTS yolo');
      }, reject, resolve);
    }).then(function () {
      db = null;
    });
  });

  function rowsToJson(res) {
    var output = [];
    for (var i = 0; i < res.rows.length; i++) {
      output.push(res.rows.item(i));
    }
    return JSON.parse(JSON.stringify(output));
  }

  it('handles errors and callback correctly 0', function () {
    var called = [];

    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('CREATE TABLE foo (bar text);', [], function () {
          called.push('a');
        });
        txn.executeSql('INSERT INTO foo VALUES ("baz")', [], function () {
          called.push('b');
        });
      }, function (err) {
        console.log(err);
        reject(err);
      }, resolve);
    }).then(function () {
      assert.deepEqual(called, ["a", "b"]);
    });
  });

  it('handles errors and callback correctly 1', function () {
    var called = [];

    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('CREATE TABLE foo (bar text);', [], function () {
          called.push('a');
        });
        txn.executeSql('INSERT INTO foo VALUES ("baz")', [], function () {
          called.push('b');
          txn.executeSql('INSERT INTO yolo VALUES ("hey")', [], function () {
            called.push('z');
          }, function () {
            called.push('c');
            txn.executeSql('INSERT INTO foo VALUES ("baz")', [], function () {
              called.push('f');
            });
          });
          txn.executeSql('INSERT INTO foo VALUES ("haha")', [], null, function () {
            called.push('e');
          });
        });
      }, function (err) {
        console.log(err);
        reject(err);
      }, resolve);
    }).then(function () {
      assert.deepEqual(called, ["a","b","c","f"]);
    });
  });

  it('handles errors and callback correctly 2', function () {
    var called = [];

    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('CREATE TABLE table1 (bar text);', [], function () {
          called.push('a');
        });
        txn.executeSql('INSERT INTO table1 VALUES ("buzz")', [], function () {
          called.push('b');
          txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
            called.push({'a': rowsToJson(res)});
          });
          txn.executeSql('INSERT INTO table1 VALUES ("hey")', [], null, function () {
            called.push('c');
            txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
              called.push({'d': rowsToJson(res)});
            });
            txn.executeSql('INSERT INTO table1 VALUES ("baz")', [], function () {
              called.push('f');
              txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
                called.push({'f': rowsToJson(res)});
              });
            });
            txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
              called.push({'e': rowsToJson(res)});
            });
          });
          txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
            called.push({'b': rowsToJson(res)});
          });
          txn.executeSql('INSERT INTO table1 VALUES ("haha")', [], null, function () {
            called.push('e');
            txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
              called.push({'d': rowsToJson(res)});
            });
          });
          txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
            called.push({'c': rowsToJson(res)});
          });
        });
      }, function (err) {
        console.log(err);
        reject(err);
      }, resolve);
    }).then(function () {
      assert.deepEqual(called, [
        "a",
        "b",
        {
          "a": [
            { "bar": "buzz"}
          ]
        },
        {
          "b": [
            { "bar": "buzz"},
            { "bar": "hey"}
          ]
        },
        {
          "c": [
            { "bar": "buzz"},
            { "bar": "hey"},
            { "bar": "haha"}
          ]
        }
      ]);
    });
  });

  it('handles errors and callback correctly 3', function () {
    var called = [];

    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('CREATE TABLE table1 (bar text);', [], function () {
          called.push('a');
        });
        txn.executeSql('INSERT INTO table1 VALUES ("buzz")', [], function () {
          called.push('b');
          txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
            called.push({'a': rowsToJson(res)});
          });
          txn.executeSql('INSERT INTO yolo VALUES ("hey")', [], null, function () {
            called.push('c');
            txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
              called.push({'d': rowsToJson(res)});
            });
            txn.executeSql('INSERT INTO table1 VALUES ("baz")', [], function () {
              called.push('f');
              txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
                called.push({'f': rowsToJson(res)});
              });
            });
            txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
              called.push({'e': rowsToJson(res)});
            });
          });
          txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
            called.push({'b': rowsToJson(res)});
          });
          txn.executeSql('INSERT INTO table1 VALUES ("haha")', [], null, function () {
            called.push('e');
            txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
              called.push({'d': rowsToJson(res)});
            });
          });
          txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
            called.push({'c': rowsToJson(res)});
          });
        });
      }, function (err) {
        console.log(err);
        reject(err);
      }, resolve);
    }).then(function () {
      assert.deepEqual(called, [
          "a",
          "b",
          {
            "a": [{"bar": "buzz"}]
          },
          "c",
          {
            "b": [{"bar": "buzz"}]
          },
          {
            "c": [{"bar": "buzz"}, {"bar": "haha"}
            ]
          },
          {
            "d": [{"bar": "buzz"}, {"bar": "haha"}]
          },
          "f",
          {
            "e": [{"bar": "buzz"}, {"bar": "haha"}, {"bar": "baz"}]
          },
          {
            "f": [{"bar": "buzz"}, {"bar": "haha"}, {"bar": "baz"}]
          }
        ]
      );
    });
  });

  it('handles errors and callback correctly 4', function () {
    var called = [];

    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('CREATE TABLE table1 (bar text);', [], function () {
          called.push('a');
          txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
            called.push({'1': rowsToJson(res)});
          });
        });
        txn.executeSql('INSERT INTO table1 VALUES ("a")', [], function () {
          called.push('b');
          txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
            called.push({'2': rowsToJson(res)});
          });
        });
        txn.executeSql('INSERT INTO table1 VALUES ("c")', [], function () {
          called.push('c');
          txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
            called.push({'3': rowsToJson(res)});
          });
        });
        txn.executeSql('DROP TABLE table1', [], function () {
          called.push('d');
        });
        txn.executeSql('CREATE TABLE table1 (bar text);', [], function () {
          called.push('e');
          txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
            called.push({'4': rowsToJson(res)});
          });
        });

      }, function (err) {
        console.log(err);
        reject(err);
      }, resolve);
    }).then(function () {
      assert.deepEqual(called, ["a","b","c","d","e",{"1":[]},{"2":[]},{"3":[]},{"4":[]}]
      );
    });
  });

  it('handles errors and callback correctly 5', function () {
    var called = [];

    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('CREATE TABLE table1 (bar text);', [], function () {
          called.push('a');
          txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
            called.push({'1': rowsToJson(res)});
          });
        });
        txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
          called.push({'z': rowsToJson(res)});
        });
        txn.executeSql('INSERT INTO table1 VALUES ("a")', [], function () {
          called.push('b');
          txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
            called.push({'2': rowsToJson(res)});
          });
        });
        txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
          called.push({'x': rowsToJson(res)});
        });
        txn.executeSql('INSERT INTO table1 VALUES ("b")', [], function () {
          called.push('c');
          txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
            called.push({'3': rowsToJson(res)});
          });
        });
        txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
          called.push({'y': rowsToJson(res)});
        });
        txn.executeSql('DROP TABLE table1', [], function () {
          called.push('d');
        });
        txn.executeSql('SELECT * FROM table1', [], function () {
          called.push('should not happen');
        }, function () {
          called.push('expected error');
        });
        txn.executeSql('CREATE TABLE table1 (bar text);', [], function () {
          called.push('e');
          txn.executeSql('INSERT INTO table1 VALUES ("c")', [], function () {
            called.push('w');
            txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
              called.push({'v': rowsToJson(res)});
            });
          });
          txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
            called.push({'4': rowsToJson(res)});
          });
        });
        txn.executeSql('SELECT * FROM table1', [], function (_txn, res) {
          called.push({'x': rowsToJson(res)});
        });

      }, function (err) {
        console.log(err);
        reject(err);
      }, resolve);
    }).then(function () {
      assert.deepEqual(called, [
          "a",
          { "z": []},
          "b",
          { "x": [{"bar": "a"}]},
          "c",
          { "y": [{"bar": "a"}, {"bar": "b"}]},
          "d",
          "expected error",
          "e",
          { "x": []},
          { "1": []},
          { "2": []},
          { "3": []},
          "w",
          { "4": [{"bar": "c"}]},
          { "v": [{"bar": "c"}]}
        ]
      );
    });
  });

  it('handles errors and callback correctly 6', function () {
    var called = [];

    return new Promise(function (resolve) {
      try {
        db.transaction(function (txn) {
          called.push(1);
          txn.executeSql("SELECT 1", [], function () {
            called.push(2);
            throw new Error("boom");
          }, function () {
            called.push(3);
            return true;
          });
        }, function () {
          called.push(4);
          resolve(true);
        }, function () {
          called.push(5);
        });
      } catch (error) {
        called.push(6);
      }
    }).then(function () {
      assert.deepEqual(called, [1, 2, 4]);
    });
  });

  it('rolls back after an error 1', function () {
    var called = [];

    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('CREATE TABLE table1 (foo text)', [], function () {
          called.push('a');
          txn.executeSql('INSERT INTO table1 VALUES ("a")', [], function () {
            called.push('b');
          });
        });
      }, reject, resolve);
    }).then(function () {
      return new Promise(function (resolve, reject) {
        db.transaction(function (txn) {
          txn.executeSql('DELETE FROM table1', [], function () {
            called.push('c');
          });
          txn.executeSql('SELECT * FROM notexist', function () {
            called.push('z');
          });
        }, resolve, reject);
      });
    }).then(function () {
      return new Promise(function (resolve, reject) {
        db.transaction(function (txn) {
          txn.executeSql('SELECT * FROM table1', [], function (_tx, res) {
            called.push(rowsToJson(res));
          });
        }, reject, resolve);
      });
    }).then(function () {
      assert.deepEqual(called, ["a","b","c",[{"foo":"a"}]]);
    });
  });

  it('rolls back after an error 2', function () {
    var called = [];

    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('CREATE TABLE table1 (foo text)', [], function () {
          called.push('a');
          txn.executeSql('INSERT INTO table1 VALUES ("a")', [], function () {
            called.push('b');
          });
        });
      }, reject, resolve);
    }).then(function () {
      return new Promise(function (resolve, reject) {
        db.transaction(function (txn) {
          txn.executeSql('DELETE FROM table1', [], function () {
            called.push('c');
            txn.executeSql('SELECT * FROM notexist', function () {
              called.push('z');
            });
          });
        }, resolve, reject);
      });
    }).then(function () {
      return new Promise(function (resolve, reject) {
        db.transaction(function (txn) {
          txn.executeSql('SELECT * FROM table1', [], function (_tx, res) {
            called.push(rowsToJson(res));
          });
        }, reject, resolve);
      });
    }).then(function () {
      assert.deepEqual(called, ["a","b","c",[{"foo":"a"}]]);
    });
  });

  it('rolls back after an error 3', function () {
    var called = [];

    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('CREATE TABLE table1 (foo text)', [], function () {
          called.push('a');
          txn.executeSql('INSERT INTO table1 VALUES ("a")', [], function () {
            called.push('b');
          });
        });
      }, reject, resolve);
    }).then(function () {
      return new Promise(function (resolve, reject) {
        db.transaction(function (txn) {
          txn.executeSql('INSERT INTO table1 VALUES ("y")', [], function () {
            called.push('d');
          });
          txn.executeSql('INSERT INTO table1 VALUES ("z")', [], function () {
            called.push('c');
            txn.executeSql('INSERT INTO table1 VALUES ("v")', [], function () {
              called.push('f');
            });
            txn.executeSql('SELECT * FROM notexist', function () {
              called.push('z');
            });
            txn.executeSql('INSERT INTO table1 VALUES ("u")', [], function () {
              called.push('g');
            });
          });
          txn.executeSql('INSERT INTO table1 VALUES ("w")', [], function () {
            called.push('e');
          });
        }, resolve, reject);
      });
    }).then(function () {
      return new Promise(function (resolve, reject) {
        db.transaction(function (txn) {
          txn.executeSql('SELECT * FROM table1', [], function (_tx, res) {
            called.push(rowsToJson(res));
          });
        }, reject, resolve);
      });
    }).then(function () {
      assert.deepEqual(called, ["a","b","d","c","e","f",[{"foo":"a"}]]);
    });
  });

  it('rolls back after an error 4', function () {
    var called = [];

    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('CREATE TABLE table1 (foo text)', [], function () {
          called.push('a');
          txn.executeSql('INSERT INTO table1 VALUES ("a")', [], function () {
            called.push('b');
          });
        });
      }, reject, resolve);
    }).then(function () {
      return new Promise(function (resolve, reject) {
        db.readTransaction(function (txn) {
          txn.executeSql('SELECT * FROM table1', [], function () {
            called.push('d');
          });
          // readTransaction throws an error here
          txn.executeSql('INSERT INTO table1 VALUES ("z")', [], function () {
            called.push('c');
          });
          txn.executeSql('SELECT * FROM table1', [], function () {
            called.push('e');
          });
        }, resolve, reject);
      });
    }).then(function () {
      return new Promise(function (resolve, reject) {
        db.transaction(function (txn) {
          txn.executeSql('SELECT * FROM table1', [], function (_tx, res) {
            called.push(rowsToJson(res));
          });
        }, reject, resolve);
      });
    }).then(function () {
      assert.deepEqual(called, ["a","b","d",[{"foo":"a"}]]);
    });
  });

  it('rolls back after an error 5', function () {
    var called = [];

    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('CREATE TABLE table1 (foo text)', [], function () {
          called.push('a');
          txn.executeSql('INSERT INTO table1 VALUES ("a")', [], function () {
            called.push('b');
          });
        });
      }, reject, resolve);
    }).then(function () {
      return new Promise(function (resolve, reject) {
        db.readTransaction(function (txn) {
          txn.executeSql('SELECT * FROM table1', [], function () {
            called.push('d');
          });
          txn.executeSql('SELECT * FROM table1', [], function () {
            called.push('e');
            txn.executeSql('SELECT * FROM table1', [], function () {
              called.push('f');
              // readTransaction throws an error here
              txn.executeSql('INSERT INTO table1 VALUES ("z")', [], function () {
                called.push('c');
              });
            });
          });
        }, resolve, reject);
      });
    }).then(function () {
      return new Promise(function (resolve, reject) {
        db.transaction(function (txn) {
          txn.executeSql('SELECT * FROM table1', [], function (_tx, res) {
            called.push(rowsToJson(res));
          });
        }, reject, resolve);
      });
    }).then(function () {
      assert.deepEqual(called, ["a","b","d","e","f",[{"foo":"a"}]]);
    });
  });

  it('does not roll back if caught 1', function () {
    var called = [];

    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('CREATE TABLE table1 (foo text)', [], function () {
          called.push('a');
          txn.executeSql('INSERT INTO table1 VALUES ("a")', [], function () {
            called.push('b');
          });
        });
      }, reject, resolve);
    }).then(function () {
      return new Promise(function (resolve, reject) {
        db.readTransaction(function (txn) {
          txn.executeSql('SELECT * FROM table1', [], function () {
            called.push('d');
          });
          // readTransaction throws an error here
          txn.executeSql('INSERT INTO table1 VALUES ("z")', [], function () {
            called.push('c');
          }, function () {
            called.push('g');
          });
          txn.executeSql('SELECT * FROM table1', [], function () {
            called.push('e');
          });
        }, reject, resolve);
      });
    }).then(function () {
      return new Promise(function (resolve, reject) {
        db.transaction(function (txn) {
          txn.executeSql('SELECT * FROM table1', [], function (_tx, res) {
            called.push(rowsToJson(res));
          });
        }, reject, resolve);
      });
    }).then(function () {
      assert.deepEqual(called, ["a","b","d","g","e",[{"foo":"a"}]]);
    });
  });

  it('does not roll back if caught 2', function () {
    var called = [];

    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('CREATE TABLE table1 (foo text)', [], function () {
          called.push('a');
          txn.executeSql('INSERT INTO table1 VALUES ("a")', [], function () {
            called.push('b');
          });
        });
      }, reject, resolve);
    }).then(function () {
      return new Promise(function (resolve, reject) {
        db.transaction(function (txn) {
          txn.executeSql('INSERT INTO table1 VALUES ("n")', [], function () {
            called.push('d');
          });
          txn.executeSql('INSERT INTO yolo VALUES ("z")', [], function () {
            called.push('c');
          }, function () {
            called.push('g');
            txn.executeSql('INSERT INTO table1 VALUES ("p")', [], function () {
              called.push('f');
            });
          });
          txn.executeSql('INSERT INTO table1 VALUES ("o")', [], function () {
            called.push('e');
          });
        }, reject, resolve);
      });
    }).then(function () {
      return new Promise(function (resolve, reject) {
        db.transaction(function (txn) {
          txn.executeSql('SELECT * FROM table1', [], function (_tx, res) {
            called.push(rowsToJson(res));
          });
        }, reject, resolve);
      });
    }).then(function () {
      assert.deepEqual(called, [
        "a","b","d","g","e","f",[{"foo":"a"},
          {"foo":"n"},{"foo":"o"},{"foo":"p"}]]);
    });
  });

  it('does not roll back if caught 3', function () {
    var called = [];

    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('CREATE TABLE table1 (foo text)', [], function () {
          called.push('a');
          txn.executeSql('INSERT INTO table1 VALUES ("a")', [], function () {
            called.push('b');
          });
        });
      }, reject, resolve);
    }).then(function () {
      return new Promise(function (resolve, reject) {
        db.transaction(function (txn) {
          txn.executeSql('INSERT INTO table1 VALUES ("n")', [], function () {
            called.push('d');
          });
          txn.executeSql('INSERT INTO yolo VALUES ("z")', [], function () {
            called.push('c');
          }, function () {
            called.push('g');
            txn.executeSql('INSERT INTO yolo VALUES ("p")', [], function () {
              called.push('f');
            }, function () {
              called.push('h');
              txn.executeSql('INSERT INTO table1 VALUES ("x")', [], function () {
                called.push('i');
              });
              txn.executeSql('INSERT INTO table1 VALUES ("y")', [], function () {
                called.push('j');
              });
              txn.executeSql('INSERT INTO table1 VALUES ("z")', [], function () {
                called.push('k');
              });
            });
          });
          txn.executeSql('INSERT INTO table1 VALUES ("o")', [], function () {
            called.push('e');
          });
        }, reject, resolve);
      });
    }).then(function () {
      return new Promise(function (resolve, reject) {
        db.transaction(function (txn) {
          txn.executeSql('SELECT * FROM table1', [], function (_tx, res) {
            called.push(rowsToJson(res));
          });
        }, reject, resolve);
      });
    }).then(function () {
      assert.deepEqual(called, [
        "a","b","d","g","e","h","i","j","k",
        [{"foo":"a"},{"foo":"n"},{"foo":"o"},{"foo":"x"},
          {"foo":"y"},{"foo":"z"}]]);
    });
  });

  it('query order matters 1', function () {
    var called = [];

    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('INSERT INTO table1 VALUES ("x")', [], function () {
          called.push('x');
        }, function () {
          called.push('y');
        });
        txn.executeSql('CREATE TABLE table1 (foo text)', [], function () {
          called.push('a');
        });
        txn.executeSql('INSERT INTO table1 VALUES ("y")', [], function () {
          called.push('z');
        }, function () {
          called.push('w');
        });
      }, reject, resolve);
    }).then(function () {
      return new Promise(function (resolve, reject) {
        db.transaction(function (txn) {
          txn.executeSql('SELECT * FROM table1', [], function (_tx, res) {
            called.push(rowsToJson(res));
          });
        }, reject, resolve);
      });
    }).then(function () {
      assert.deepEqual(called, ["y","a","z",[{"foo":"y"}]]);
    });
  });

  it('query order matters 2', function () {
    var called = [];

    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('INSERT INTO table1 VALUES ("x")', [], function () {
          called.push('x');
        }, function () {
          called.push('y');
        });
        txn.executeSql('CREATE TABLE table1 (foo text)', [], function () {
          called.push('a');
          txn.executeSql('DELETE FROM table1 WHERE foo="y"', [], function () {
            called.push('c');
          });
        });
        txn.executeSql('INSERT INTO table1 VALUES ("y")', [], function () {
          called.push('z');
        }, function () {
          called.push('w');
        });
      }, reject, resolve);
    }).then(function () {
      return new Promise(function (resolve, reject) {
        db.transaction(function (txn) {
          txn.executeSql('SELECT * FROM table1', [], function (_tx, res) {
            called.push(rowsToJson(res));
          });
        }, reject, resolve);
      });
    }).then(function () {
      assert.deepEqual(called, ["y","a","z","c",[]]);
    });
  });

  it('query order matters 3', function () {
    var called = [];

    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('CREATE TABLE table1 (foo text)', [], function () {
          called.push('a');
        });
        txn.executeSql('INSERT INTO table1 VALUES ("y")', [], function () {
          called.push('b');
        });
        txn.executeSql('DELETE FROM table1 WHERE foo="y"', [], function () {
          called.push('c');
        });
      }, reject, resolve);
    }).then(function () {
      return new Promise(function (resolve, reject) {
        db.transaction(function (txn) {
          txn.executeSql('SELECT * FROM table1', [], function (_tx, res) {
            called.push(rowsToJson(res));
          });
        }, reject, resolve);
      });
    }).then(function () {
      assert.deepEqual(called, ["a","b","c",[]]);
    });
  });

  it('query order matters 4', function () {
    var called = [];

    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('CREATE TABLE table1 (foo text)', [], function () {
          called.push('a');
          txn.executeSql('DELETE FROM table1 WHERE foo="y"', [], function () {
            called.push('c');
          });
        });
        txn.executeSql('INSERT INTO table1 VALUES ("y")', [], function () {
          called.push('b');
        });
      }, reject, resolve);
    }).then(function () {
      return new Promise(function (resolve, reject) {
        db.transaction(function (txn) {
          txn.executeSql('SELECT * FROM table1', [], function (_tx, res) {
            called.push(rowsToJson(res));
          });
        }, reject, resolve);
      });
    }).then(function () {
      assert.deepEqual(called, ["a","b","c",[]]);
    });
  });

  it('query order matters 5', function () {
    var called = [];

    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('CREATE TABLE table1 (foo text)', [], function () {
          called.push('a');
        });
        txn.executeSql('DELETE FROM table1 WHERE foo="y"', [], function () {
          called.push('c');
        });
        txn.executeSql('INSERT INTO table1 VALUES ("y")', [], function () {
          called.push('b');
        });
      }, reject, resolve);
    }).then(function () {
      return new Promise(function (resolve, reject) {
        db.transaction(function (txn) {
          txn.executeSql('SELECT * FROM table1', [], function (_tx, res) {
            called.push(rowsToJson(res));
          });
        }, reject, resolve);
      });
    }).then(function () {
      assert.deepEqual(called, ["a","c","b",[{"foo":"y"}]]);
    });
  });

  it('query order matters 6', function () {
    var called = [];

    return new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('CREATE TABLE table1 (foo text)', [], function () {
          called.push('a');
          txn.executeSql('DROP TABLE table1;', [], function () {
            called.push('b');
          });
          txn.executeSql('CREATE TABLE table1 (foo text);', [], function () {
            called.push('c');
          });
          txn.executeSql('INSERT INTO table1 VALUES ("x")', [], function () {
            called.push('d');
          });
        });
        txn.executeSql('INSERT INTO table1 VALUES ("y")', [], function () {
          called.push('e');
        });
      }, reject, resolve);
    }).then(function () {
      return new Promise(function (resolve, reject) {
        db.transaction(function (txn) {
          txn.executeSql('SELECT * FROM table1', [], function (_tx, res) {
            called.push(rowsToJson(res));
          });
        }, reject, resolve);
      });
    }).then(function () {
      assert.deepEqual(called, ["a","e","b","c","d",[{"foo":"x"}]]);
    });
  });

  it('callback order 1', function () {
    var called = [];
    return new Promise(function (resolve, reject) {
      var numTransactions = 2;
      var rejected;
      function done() {
        if (rejected) {
          return reject();
        }
        resolve();
      }
      function resolveOne() {
        if (!--numTransactions) {
          done();
        }
      }
      function rejectOne() {
        rejected = true;
        if (!--numTransactions) {
          done();
        }
      }

      called.push('a');
      db.transaction(function (txn) {
        called.push('b');
        txn.executeSql('CREATE TABLE table1 (foo text)', [], function () {
          called.push('c');
          txn.executeSql('DROP TABLE table1;', [], function () {
            called.push('d');
          });
          called.push('e');
          txn.executeSql('CREATE TABLE table1 (foo text);', [], function () {
            called.push('f');
          });
          called.push('g');
          txn.executeSql('INSERT INTO table1 VALUES ("x")', [], function () {
            called.push('h');
          });
          called.push('i');
        });
        called.push('j');
        txn.executeSql('INSERT INTO table1 VALUES ("y")', [], function () {
          called.push('k');
        });
        called.push('l');
      }, rejectOne, resolveOne);
      called.push('m');
      db.transaction(function (txn) {
        called.push('n');
        txn.executeSql('SELECT 1 + 1', [], function () {
          called.push('o');
        });
        called.push('p');
      }, rejectOne, resolveOne);
    }).then(function () {
      var expected = [
        "a","m","b","j","l","c","e","g","i","k","d","f","h","n","p","o"
      ];
      assert.deepEqual(called, expected);
    });
  });

  it('callback order 2', function () {
    var called = [];
    return new Promise(function (resolve, reject) {
      var numTransactions = 7;
      var rejected;
      function done() {
        if (rejected) {
          return reject();
        }
        resolve();
      }
      function resolveOne() {
        if (!--numTransactions) {
          done();
        }
      }
      function rejectOne() {
        rejected = true;
        if (!--numTransactions) {
          done();
        }
      }

      called.push('a');
      db.readTransaction(function (txn) {
        called.push('b');
        txn.executeSql('SELECT 1 + 1', [], function () {
          called.push('c');
          txn.executeSql('SELECT 1 + 1', [], function () {
            called.push('d');
          });
          called.push('e');
          txn.executeSql('SELECT 1 + 1', [], function () {
            called.push('f');
          });
          called.push('g');
        });
        called.push('j');
        txn.executeSql('SELECT 1 + 1', [], function () {
          called.push('k');
        });
        called.push('l');
      }, rejectOne, resolveOne);
      called.push('m');
      db.transaction(function (txn) {
        called.push('n');
        txn.executeSql('SELECT 1 + 1', [], function () {
          called.push('o');
        });
        called.push('p');
      }, rejectOne, resolveOne);
      called.push('1');
      db.readTransaction(function (txn) {
        called.push('2');
        txn.executeSql('SELECT 1 + 1', [], function () {
          called.push('3');
          txn.executeSql('SELECT 1 + 1', [], function () {
            called.push('4');
          });
          called.push('5');
          txn.executeSql('SELECT 1 + 1', [], function () {
            called.push('6');
          });
          called.push('7');
        });
        called.push('8');
        txn.executeSql('SELECT 1 + 1', [], function () {
          called.push('9');
        });
        called.push('10');
      }, rejectOne, resolveOne);
      called.push('11');
      db.readTransaction(function (txn) {
        called.push('alpha');
        txn.executeSql('SELECT 1 + 1', [], function () {
          called.push('beta');
          txn.executeSql('SELECT 1 + 1', [], function () {
            called.push('gamma');
          });
          called.push('delta');
          txn.executeSql('SELECT 1 + 1', [], function () {
            called.push('epsilon');
          });
          called.push('zeta');
        });
        called.push('eta');
        txn.executeSql('SELECT 1 + 1', [], function () {
          called.push('theta');
        });
        called.push('iota');
      }, rejectOne, resolveOne);
      called.push('ichi');
      db.readTransaction(function (txn) {
        called.push('ni');
        txn.executeSql('SELECT 1 + 1', [], function () {
          called.push('san');
          txn.executeSql('SELECT 1 + 1', [], function () {
            called.push('shi');
          });
          called.push('go');
          txn.executeSql('SELECT 1 + 1', [], function () {
            called.push('roku');
          });
          called.push('shichi');
        });
        called.push('hachi');
        txn.executeSql('SELECT 1 + 1', [], function () {
          called.push('kyuu');
        });
        called.push('juu');
      }, rejectOne, resolveOne);
      called.push('un');
      db.readTransaction(function (txn) {
        called.push('deux');
        txn.executeSql('SELECT 1 + 1', [], function () {
          called.push('trois');
          txn.executeSql('SELECT 1 + 1', [], function () {
            called.push('quatre');
          });
          called.push('cinq');
          txn.executeSql('SELECT 1 + 1', [], function () {
            called.push('six');
          });
          called.push('sept');
        });
        called.push('huit');
        txn.executeSql('SELECT 1 + 1', [], function () {
          called.push('neuf');
        });
        called.push('dix');
      }, rejectOne, resolveOne);
      called.push('onze');
      db.transaction(function (txn) {
        called.push('12');
        txn.executeSql('SELECT 1 + 1', [], function () {
          called.push('13');
        });
        called.push('14');
      }, rejectOne, resolveOne);
    }).then(function () {
      var expected = ["a", "m", "1", "11", "ichi", "un", "onze", "b", "j",
        "l", "c", "e", "g", "k", "d", "f", "n", "p", "o", "2", "8", "10",
        "3", "5", "7", "9", "4", "6", "alpha", "eta", "iota", "beta",
        "delta", "zeta", "theta", "gamma", "epsilon", "ni", "hachi", "juu",
        "san", "go", "shichi", "kyuu", "shi", "roku", "deux", "huit", "dix",
        "trois", "cinq", "sept", "neuf", "quatre", "six", "12", "14", "13"];
      assert.deepEqual(called, expected);
    });
  });

  it('callback order 3', function () {
    var called = [];
    return new Promise(function (resolve) {
      called.push('a');
      var db2 = openDatabase('testdbs/testdb-' + Math.random(),
        '1.0', 'yolo', 1, function (db3) {
        called.push('b');
        resolve([db2, db3]);
      });
      called.push('c');
    }).then(function (dbs) {
      assert(dbs[0] === dbs[1]);
      assert.deepEqual(called, ['a', 'c', 'b']);
    });
  });

});
