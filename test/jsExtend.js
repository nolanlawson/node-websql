// Minimal replacement for js-extend, using Object.assign
'use strict';

exports.extend = function extend () {
  return Object.assign.apply(null, arguments);
};