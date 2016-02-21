node-websql [![Build Status](https://travis-ci.org/nolanlawson/node-websql.svg?branch=master)](https://travis-ci.org/nolanlawson/node-websql) [![Coverage Status](https://coveralls.io/repos/github/nolanlawson/node-websql/badge.svg?branch=master)](https://coveralls.io/github/nolanlawson/node-websql?branch=master)
====

The [Web SQL Database API][websql], implemented for Node
using [sqlite3](https://github.com/mapbox/node-sqlite3).

Install
----

    npm install websql

Usage
----

```js
var openDatabase = require('websql');
```

Create a SQLite3 database called `mydb.db`:

```js
var db = openDatabase('mydb.db', '1.0', 'description', 1);
```

Create an in-memory database:

```js
var db = openDatabase(':memory:', '1.0', 'description', 1);
```

API
---

### openDatabase(name, version, description, size [, callback])

The `name` is the name of the database. It's passed verbatim to [sqlite3][].

The `version` is the database version (_currently ignored - see below_).

The `description` and `size` attributes are ignored, but they are required for
compatibility with the WebSQL API.

The `callback` just returns the same database object returned 
synchronously (_migrations currently aren't supported - see below_).

For more information how to use the WebSQL API, see [the spec][websql] or
[various](http://www.html5rocks.com/en/tutorials/webdatabase/todo/) [tutorials](html5doctor.com/introducing-web-sql-databases/).

For more information on `sqlite3`, see [the SQLite3 readme](sqlite3).

Goals
----

The [Web SQL Database API][websql] is a deprecated
standard, but in many cases it's useful to reuse legacy code
designed for browsers that support WebSQL. Also, it allows you to quickly
test WebSQL-based code in Node, which can be convenient.

The goal of this API is to exactly match the existing WebSQL API, as implemented
in browsers. If there's any difference between browsers (e.g. `rows[0]` is supported
in Chrome, whereas only `rows.item(0)` is supported in Safari), then the lowest-common
denominator version is exported by this library.

This library has a robust test suite, and has been known to pass the PouchDB
test suite as well.

Non-Goals
---

This library is _not_ designed to:

- Invent new APIs, e.g. deleting databases, supporting `BLOB`s, encryption, etc.
- Support WebSQL in Firefox, IE, or other non-WebSQL browsers

In other words, the goal is not to carry the torch of WebSQL,
but rather to bridge the gap from existing WebSQL-based code to Node.js.

TODOs
---

The versioning and migration APIs 
(i.e. [`changeVersion()`](https://www.w3.org/TR/webdatabase/#dom-database-changeversion)) 
are not supported. Pull requests welcome!

Testing
----

First:

    npm install

Main test suite:

    npm test

Linter:

    npm run lint

Test in debug mode (e.g. with the `node-inspector`):

    npm run test-debug

Run the test suite against actual WebSQL in a browser:

    npm run test-local
    
Run the actual-WebSQL test against PhantomJS:

    npm run test-phantom

[websql]: https://www.w3.org/TR/webdatabase/
[sqlite3]: https://github.com/mapbox/node-sqlite3
