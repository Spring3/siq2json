#!/usr/bin/env node

import { Entry, Package } from './types';
import * as chalk from 'chalk';
import * as yargs from 'yargs';
import * as fs from 'fs';
import { promisify } from 'util';
import * as path from 'path';
import * as unzipper from 'unzipper';
import * as xml2js from 'xml2js';
import * as il from 'iconv-lite';

const readFilePromise = promisify(fs.readFile);

const options = yargs.argv;

let relativePath = options._[0];
let extension = path.extname(relativePath);

if (!extension) {
  extension = '.siq';
  relativePath += extension;
}

if (extension !== '.siq') {
  console.error(chalk.yellow('Unsupported file extension'));
  process.exit(1);
}

const zipFilePath = path.resolve(process.cwd(), relativePath) as string;

if (!fs.existsSync(zipFilePath)) {
  console.error(chalk.yellow('Unable to locate file at', zipFilePath));
  process.exit(1);
}

const filename = path.basename(relativePath).replace(extension, '') as string;
const folderName = `${filename}-temp`;
const unzippedFolder = path.join(path.dirname(zipFilePath), folderName) as string;
const rootXml = path.normalize(`${unzippedFolder}/content.xml`) as string;

const unzip = (zipFilePath: string) : Promise<void> => {
  return new Promise((resolve, reject) => {
    const assertedPaths = [] as string[];
    fs.createReadStream(zipFilePath)
      .pipe(unzipper.Parse())
      .on('entry', (entry : Entry) => {
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
  .then((jsonPackage) => {
    const { $, info, rounds } = jsonPackage.package as Package;

    const authorsInfo = info.find(entry => !!entry.authors);
    const authors = authorsInfo
      ? authorsInfo.authors.reduce((acc, obj) => [...acc, ...obj.author], [])
      : [];
    const gameRounds = rounds[0].round.map((round) => {
      return {
        name: round.$.name,
        themes: round.themes[0].theme.map((theme) => {
          return {
            name: theme.$.name,
            questions: theme.questions
          }
        })
      }
    });
    const json = {
      id: $.id,
      name: $.name,
      rounds: gameRounds,
      metadata: {
        version: $.version,
        createdBy: authors,
        createdAt: $.date
      }
    };
    fs.writeFileSync(path.join(unzippedFolder, `${filename}.json`), JSON.stringify(jsonPackage, null, 2));
    console.log(rounds[0].round);
    console.log('result', JSON.stringify(json, null, 2));
    console.log(gameRounds[0].themes[0].questions[0]);
  })
  .catch((error) => {
    console.error(chalk.yellow('Failed to parse the file: ', error.message));
  });
