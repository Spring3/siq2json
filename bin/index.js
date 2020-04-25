#!/usr/bin/env node

const chalk = require('chalk');
const yargs = require('yargs');
const fs = require('fs');
const { promisify } = require('util');
const path = require('path');
const unzipper = require('unzipper');
const xml2js = require('xml2js');
const il = require('iconv-lite');

const readFilePromise = promisify(fs.readFile);

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

if (extension !== '.siq') {
  console.error('Unsupported file extension');
  process.exit(1);
}

const zipFilePath = path.resolve(process.cwd(), options.src);
const filename = path.basename(options.src).replace(extension, '-temp');
const unzippedFolder = path.resolve(process.cwd(), filename);
const rootXml = path.normalize(`${unzippedFolder}/content.xml`);

const unzip = (zipFilePath) => {
  return new Promise((resolve, reject) => {
    const assertedPaths = [];
    fs.createReadStream(zipFilePath)
      .pipe(unzipper.Parse())
      .on('entry', (entry) => {
        const decodedFileName = decodeURIComponent(
          entry.isUnicode
            ? entry.path
            : il.decode(entry.props.pathBuffer, 'cp866')
        );
        console.log(decodedFileName);
        const fileDestination = path.join(unzippedFolder, decodedFileName);
        const directory = path.dirname(fileDestination);
        if (!assertedPaths.includes(directory) && !fs.existsSync(directory)) {
          fs.mkdirSync(directory, { recursive: true });
          assertedPaths.push(directory);
        }

        entry.pipe(fs.createWriteStream(fileDestination));
      })
      .once('close', resolve)
      .once('error', reject);
  });
};

unzip(zipFilePath)
  .then(() => {
    console.log(`Unzipped`);
    return readFilePromise(rootXml);
  })
  .then((xml) => {
    return xml2js.parseStringPromise(xml);
  })
  .then(({ package }) => {
    const { $, info, rules } = package;
    console.log('$', $);
    console.log('info', JSON.stringify(info, null, 2));
  })
  .catch((error) => {
    console.error(chalk.yellow('Failed to parse the file: ', error.message));
  });
