#!/usr/bin/env node

const chalk = require('chalk');
const yargs = require('yargs');

const options = yargs
  .usage('Usage -src <path>')
  .option('src', {
    alias: 'file',
    describe: 'Path to the .siq file',
    type: 'string',
    demandOption: true
  })
  .argv;

console.log(`Hello, ${options.src}`);
