const fs = require('fs');
const chalk = require('chalk');

const defaultConfigFile = 'app/config/default.json';
const configFile = 'app/config/config.json';
const storageFile = 'data/storage.json';

const args = process.argv.slice(2);
const initConfig = args[0] === '--init-config';

if (!fs.existsSync(configFile) || initConfig) {
  // copy config
  fs.copyFileSync(defaultConfigFile, configFile);

  // create storage
  fs.writeFileSync(storageFile, JSON.stringify({
    subscribers: []
  }));

  if (!initConfig) {
    console.warn(chalk.red('No config detected...'));
    console.log('Modify app/config/config.json as needed');
  }

} else {
  require('./app/lib/router');
}
