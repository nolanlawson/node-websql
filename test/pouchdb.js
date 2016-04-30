'use strict';

if (typeof process === 'undefined' || process.browser) {
  module.exports = require('./pouchdb-browser');
} else {
  module.exports = require('./pouchdb-node');
}