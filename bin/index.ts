#!/usr/bin/env node

import { Entry, Package, Author, RoundData, ThemeData, QuestionData, Scenario, MediaScenario } from './types';
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

const unWrap = (array: any[], onEntry: Function) => {
  return array.reduce((acc, entry) => [...acc, onEntry(entry)], []);
}

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
      ? unWrap(authorsInfo.authors, (obj: Author) => obj.author)
      : [];
    const gameRounds = unWrap(rounds[0].round, (round: RoundData) => {
      return {
        name: round.$.name,
        themes: unWrap(round.themes[0].theme, (theme: ThemeData) => {
          return {
            name: theme.$.name,
            questions: unWrap(theme.questions[0].question, (question: QuestionData) => {
              const q = {
                points: parseInt(question.$.price, 10),
                mode: 'default',
                type: 'plain',
                answers: question.right[0].answer,
                task: {
                  text: '',
                  images: [] as string[],
                  sounds: [] as string[]
                },
                explanation: ''
              };

              if (question.info) {
                q.explanation = question.info[0].comments[0];
              }

              if (question.type) {
                const typeName = question.type[0].$.name;
                switch(typeName) {
                  case 'cat':
                  case 'bagcat':
                    q.mode = 'delegate'
                    if (Array.isArray(question.type[0].param)) {
                      for (const param of question.type[0].param) {
                        switch(param.$.name) {
                          case 'cost':
                            q.points = parseInt(param._, 10);
                            break;
                          case 'theme':
                            q.explanation = param._;
                            break;
                          default:
                            break;
                        }
                      }
                    }
                    break;
                  default:
                    q.mode = typeName;
                }
              }

              const setQuestionMediaTask = (mediaScenario : MediaScenario) => {
                switch(mediaScenario.$.type) {
                  case 'image':
                    q.task.images.push(mediaScenario._);
                    break;
                  case 'voice':
                    q.task.sounds.push(mediaScenario._);
                    break;
                  case 'say':
                    q.explanation = mediaScenario._;
                    break;
                  case 'marker':
                    break;
                  default:
                    console.warn(`Detected unhandled scenario type "${mediaScenario.$.type}. Please open a ticket to support it`);
                }
              }

              const scenarioDetails = question.scenario[0].atom;
              if (scenarioDetails.length === 1 && typeof scenarioDetails[0] === 'string') {
                q.task.text = scenarioDetails[0];
              } else {
                q.type = 'media';
                if (scenarioDetails.length > 1) {
                  for (const scenario of scenarioDetails) {
                    if (typeof scenario === 'string') {
                      q.task.text = scenario;  
                    } else {
                      setQuestionMediaTask(scenario as MediaScenario); 
                    }
                  }
                } else {
                  setQuestionMediaTask(scenarioDetails[0] as MediaScenario)
                }
              }

              return q;
            })
          };
        })
      };
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
    fs.writeFileSync(path.join(unzippedFolder, `${filename}-original.json`), JSON.stringify(jsonPackage, null, 2));
    console.log(`Created ${filename}-original.json`);
    fs.writeFileSync(path.join(unzippedFolder, `${filename}-converted.json`), JSON.stringify(json, null, 2));
    console.log(`Created ${filename}-converted.json`);
  })
  .catch((error) => {
    console.error(chalk.yellow('Failed to parse the file: ', error.message));
  });
