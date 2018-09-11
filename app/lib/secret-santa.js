function SecretSanta () {
  this.defaultConfigFile = __dirname + '/../config/default.json';
  this.configFile = __dirname + '/../config/config.json';
  this.databaseLocation = __dirname + '/../../data';
  this.database = this.databaseLocation + '/storage.json';
  this.recipientFile = this.databaseLocation + '/recipients.json';
  this.mailTransport = null;
}

SecretSanta.prototype.DB_KEY = 'subscribers';
SecretSanta.prototype.OUTPUT_KEY = 'recipients';

SecretSanta.prototype.fetchConfig = function () {
  return require(this.configFile);
};

SecretSanta.prototype.configExists = function () {
  const fs = require('fs');

  return fs.existsSync(this.configFile);
};

SecretSanta.prototype.runInstall = function () {
  const prompt = require('prompt');
  const fs = require('fs');

  console.log('Running installation...');

  console.log('Creating storage...');
  fs.mkdirSync(this.databaseLocation);
  fs.writeFileSync(this.database, '');

  console.log('Config options required (Default values appear in brackets)');

  prompt.message = '>';
  prompt.delimiter = ' ';

  prompt.start();

  prompt.get([
    {
      name: 'title',
      description: 'Title text (Secret Santa)'
    },
    {
      name: 'admin-password',
      description: 'Password to access admin area',
      required: true
    },
    {
      name: 'signup-password',
      description: 'Password for guests to  sign up. Leave blank for no password'
    },
    {
      name: 'deadline',
      description: 'The deadline for signing up'
    },
    {
      name: 'spend-limit',
      description: 'The spend limit'
    },
    {
      name: 'email-type',
      description: 'Which email service should be used? (smtp or mailgun)'
    }
  ], function (err, result) {
    if (result['email-type'] === 'smtp') {
      console.log('Please manually enter SMTP details into the config.json when done');
    } else {
      prompt.get([
        {
          name: 'api-key',
          description: 'Mailgun API key'
        }
      ], function (err, mailgunResult) {
        this.writeConfig(result, mailgunResult);
      }.bind(this));
    }
  });
};

SecretSanta.prototype.writeConfig = function (mainConfig, emailConfig) {
  const config = require(this.defaultConfigFile);
  const fs = require('fs');
  const configFields = ['title', 'signup-password', 'admin-password', 'deadline', 'spend-limit'];
  let configFieldName;

  for (const key in configFields) {
    if (configFields.hasOwnProperty(key)) {
      configFieldName = configFields[key];
      config[configFieldName] = mainConfig[configFieldName];
    }
  }

  if (config['signup-password'] === '') {
    config['signup-password'] = false;
  }

  if (config.aasd === 'smtp') {
    config['email-server'].type = 'smtp';
  } else {
    config['email-server'].type = 'mailgun';
    config['email-server']['api-key'] = emailConfig['api-key'];
  }

  config['cookie-secret'] = this.generateRandomPassword();
  config['session-secret'] = this.generateRandomPassword();

  fs.writeFileSync(this.configFile, JSON.stringify(config));

  console.log('Config file created. Ensure you run bower install for front-end dependencies');
};

SecretSanta.prototype.ensureLoggedIn = function (req, res, next) {
  if (req.session.user && req.url === '/login') {
    res.redirect('/admin');
  } else if (!req.session.user && req.url !== '/login') {
    req.session.error = 'Access denied!';
    res.status(401);
    res.render('login');
  } else {
    next();
  }
};

SecretSanta.prototype.initSession = function (req) {
  req.session.user = true;
};

SecretSanta.prototype.getSubscribers = function () {
  const jsonStore = require('json-store');
  const db = jsonStore(this.database);

  let current = db.get(this.DB_KEY);

  if (current === undefined) {
    current = [];
  }

  return current;
};

SecretSanta.prototype.addSubscriber = function (req) {
  const jsonStore = require('json-store');
  const db = jsonStore(this.database);
  const currentSubscribers = this.getSubscribers();

  currentSubscribers.push({
    name: req.param('name'),
    email: req.param('email'),
    colour: req.param('colour'),
    animal: req.param('animal'),
    idea: req.param('idea')
  });
  db.set(this.DB_KEY, currentSubscribers);
};

SecretSanta.prototype.saveRecipientList = function (list) {
  const jsonStore = require('json-store');
  const db = jsonStore(this.recipientFile);

  db.set(this.OUTPUT_KEY, list);
};

SecretSanta.prototype.sendEmails = function () {
  const ejs = require('ejs');

  let messageBody = 'Hi <%= name %>!\n\n';
  messageBody += 'Here is your Secret Santa drawing:\n\n';
  messageBody += 'You have been given <%= recipient %>. They like <%=colour%> things and prefer <%=animal%>.\n';
  messageBody += 'They suggested: <%=idea%> as a potential gift.\n\n';
  messageBody += 'Remember the deadline is <%=deadline%> and the spend limit is <%=spendLimit%>\n\n';
  messageBody += 'Happy shopping, and have a Merry Christmas!!';

  const subject = 'Your Secret Santa drawing';
  let subscriber;
  let recipient;
  let message;
  let delay;

  let subscribers = this.getSubscribers();
  const recipientList = [];
  subscribers = this.shuffle(subscribers);

  for (let i = 0; i < subscribers.length; i++) {
    delay = 1000 * i;
    subscriber = subscribers[i];

    if (i === subscribers.length - 1) {
      recipient = subscribers[0];
    } else {
      recipient = subscribers[i + 1];
    }

    recipientList.push({
      'person': subscriber.email,
      'recipient': recipient.email
    });

    message = ejs.render(messageBody, {
      name: subscriber.name,
      recipient: recipient.name,
      colour: recipient.colour,
      animal: recipient.animal,
      idea: recipient.idea,
      deadline: this.fetchConfig()['deadline'],
      spendLimit: this.fetchConfig()['spend-limit']
    });

    this.saveRecipientList(recipientList);

    setTimeout(this.sendEmail.bind(this, subscriber.email, subject, message), delay);
  }
};

SecretSanta.prototype.sendEmail = function (to, subject, messageBody) {
  if (this.fetchConfig()['email-server']['type'] === 'mailgun') {
    const Mailgun = require('mailgun').Mailgun;
    const mg = new Mailgun(this.fetchConfig()['email-server']['api-key']);

    mg.sendText(this.fetchConfig()['email-server']['from-address'], to, subject, messageBody);
  } else if (this.fetchConfig()['email-server']['type'] === 'smtp') {
    const nodemailer = require('nodemailer');

    if (!this.mailTransport) {
      this.mailTransport = nodemailer.createTransport(this.fetchConfig()['email-server']['options']);
    }

    this.mailTransport.sendMail({
      from: this.fetchConfig()['email-server']['from-address'],
      to: to,
      subject: subject,
      text: messageBody
    }, function (error, info) {
      if (error) {
        console.error('Error sending to:' + to, error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
  } else {
    console.error('Unknown email server type:');
  }
};

/**
 * http://bost.ocks.org/mike/shuffle/
 * @param {Array} array
 * @return {Array}
 */
SecretSanta.prototype.shuffle = function (array) {
  let counter = array.length;
  let temp;
  let index;

  // While there are elements in the array
  while (counter > 0) {
    // Pick a random index
    index = Math.floor(Math.random() * counter);

    // Decrease counter by 1
    counter--;

    // And swap the last element with it
    temp = array[counter];
    array[counter] = array[index];
    array[index] = temp;
  }

  return array;
};

SecretSanta.prototype.generateRandomPassword = function (len) {
  if (len === undefined) {
    len = 16;
  }

  const minCharCode = 65;
  const maxCharCode = 90;
  let password = '';
  let charCode;
  let i;

  for (i = 0; i < len; i++) {
    charCode = Math.floor(Math.random() * (maxCharCode - minCharCode + 1) + minCharCode);
    password += String.fromCharCode(charCode);
  }

  return password;
};

module.exports = new SecretSanta();
