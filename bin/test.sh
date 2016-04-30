#!/usr/bin/env bash

if [[ ! -z $GREP ]]; then
  mocha --grep=$GREP test/test.js
else
  mocha test/test.js
fi