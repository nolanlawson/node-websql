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

describe('main test suite', function () {

  this.timeout(2000);

  it('throw error for openDatabase args < 1', function () {
    return expectError(Promise.resolve().then(function () {
      var db = openDatabase();
    }));
  });
  it('throw error for openDatabase args < 2', function () {
    return expectError(Promise.resolve().then(function () {
      var db = openDatabase('mydb');
    }));
  });
  it('throw error for openDatabase args < 3', function () {
    return expectError(Promise.resolve().then(function () {
      var db = openDatabase('mydb', 'yolo');
    }));
  });

  it('throw error for openDatabase args < 4', function () {
    return expectError(Promise.resolve().then(function () {
      var db = openDatabase('mydb', 'yolo', 'hey');
    }));
  });

  it('does a basic database operation', function () {
    var db = openDatabase('mydb', '1.0', 'yolo', 100000);
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
    var db = openDatabase('mydb', '1.0', 'yolo', 100000);
    return expectError(new Promise(function (resolve, reject) {
      db.transaction(function (txn) {
        txn.executeSql('SELECT foo FROM yolo', [], function (txn, result) {
          resolve(result);
        }, function (txn, err) {
          console.log('rejecting with', err);
          reject(err);
        });
      });
    }));
  });

});