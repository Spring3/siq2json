#!/usr/bin/env node

const chalk = require('chalk');
const yargs = require('yargs');
const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

const options = yargs
  .usage('Usage -src <path>')
  .option('src', {
    alias: 'file',
    describe: 'Path to the .siq file',
    type: 'string',
    demandOption: true
  })
  .argv;

const extension = path.extname(options.src);
const filename = path.basename(options.src);

if (extension !== '.siq') {
  console.error('Unsupported file extension');
  process.exit(1);
}


const filepath = path.resolve(process.cwd(), options.src);

console.log('path', filepath);

fs.createReadStream(filepath)
  .pipe(unzipper.Extract({ path: `./${filename}`, concurrency: 2 }));

console.log('Unzipped');
