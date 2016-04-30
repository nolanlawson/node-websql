'use strict';

require('bluebird').longStackTraces();
require('chai').use(require('chai-as-promised'));

var denodeify = require('denodeify');
var rimraf = denodeify(require('rimraf'));
var mkdirp = denodeify(require('mkdirp'));

describe('node-websql test suite', function () {
  this.timeout(300000);

  before(function () {
    if (typeof process !== 'undefined' && !process.browser) {
      return rimraf('testdb').then(function () {
        return rimraf('testdbs');
      }).then(function () {
        return mkdirp('testdbs');
      });
    }
  });

  after(function () {
    if (typeof process !== 'undefined' && !process.browser) {
      return rimraf('testdb').then(function () {
        return rimraf('testdbs');
      });
    }
  });

  require('./test.main.js');
  require('./test.compaction.js');
  require('./test.mapreduce.js');
  require('./test.attachments.js');
  require('./test.basics.js');
  require('./test.changes.js');
  require('./test.bulk_docs.js');
  require('./test.all_docs.js');
  require('./test.replication.js');
});
