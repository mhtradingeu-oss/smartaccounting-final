const fs = require('fs');
const path = require('path');

const VERSION_FILE_PATH = path.resolve(__dirname, '..', '..', 'VERSION');

function readVersionFile() {
  try {
    return fs.readFileSync(VERSION_FILE_PATH, 'utf8').trim();
  } catch (error) {
    return null;
  }
}

const fallbackPackage = require('../../package.json');
const fileVersion = readVersionFile();
const derivedVersion = fileVersion || fallbackPackage.version || '0.0.0';

module.exports = {
  version: derivedVersion,
  versionFilePath: VERSION_FILE_PATH,
  source: fileVersion ? 'VERSION' : 'package.json',
};
