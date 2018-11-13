function SecretSanta() {
  this.defaultConfigFile = __dirname + '/../config/default.json';
  this.configFile = __dirname + '/../config/config.json';
  this.databaseLocation = __dirname + '/../../data';
  this.database = this.databaseLocation + '/storage.json';
  this.mailTransport = null;
}

SecretSanta.prototype.DB_KEY = 'subscribers';
SecretSanta.prototype.SENT = 'sent';

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

  if (!fs.lstatSync(this.databaseLocation).isDirectory()) {
    fs.mkdirSync(this.databaseLocation);
  }

  fs.writeFileSync(this.database, '{}');

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
      this.writeConfig(result);
      console.log('Please manually enter SMTP details into app/config/config.json when done');
    } else {
      prompt.get([
        {
          name: 'api-key',
          description: 'Mailgun API key'
        }
      ], function (err, mailgunResult) {
        if (!err) {
          this.writeConfig(result, mailgunResult);
        } else {
          console.error(err);
        }
      }.bind(this));
    }
  }.bind(this));
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

  if (mainConfig['signup-password'] === '') {
    config['signup-password'] = false;
  }

  if (mainConfig['email-type'] === 'smtp') {
    config['email-server'].type = 'smtp';
  } else {
    config['email-server'].type = 'mailgun';
    config['email-server']['api-key'] = emailConfig['api-key'];
  }

  config['cookie-secret'] = this.generateRandomPassword();
  config['session-secret'] = this.generateRandomPassword();

  fs.writeFileSync(this.configFile, JSON.stringify(config));
  console.log('Config file created.');
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

SecretSanta.prototype.haveEmailsAlreadySent = function () {
  const jsonStore = require('json-store');
  const db = jsonStore(this.database);

  return !!db.get(this.SENT);
};

SecretSanta.prototype.markEmailsAsSent = function () {
  const jsonStore = require('json-store');
  const db = jsonStore(this.database);

  db.set(this.SENT, true);
};

SecretSanta.prototype.addSubscriber = function (req) {
  const jsonStore = require('json-store');
  const db = jsonStore(this.database);
  const currentSubscribers = this.getSubscribers();

  currentSubscribers.push({
    name: req.body.name,
    email: req.body.email,
    colour: req.body.colour,
    animal: req.body.animal,
    idea: req.body.idea
  });
  db.set(this.DB_KEY, currentSubscribers);
};

SecretSanta.prototype.saveSubscribers = function (list) {
  const jsonStore = require('json-store');
  const db = jsonStore(this.database);

  db.set(this.DB_KEY, list);
};


SecretSanta.prototype.createAndSendEmails = function () {
  const list = this.assignRecipients();

  this.sendEmails(list);

  return list;
};

SecretSanta.prototype.assignRecipients = function () {
  let subscribers = this.getSubscribers();
  let subscriber;
  let recipient;

  subscribers = this.shuffle(subscribers);

  for (let i = 0; i < subscribers.length; i++) {
    subscriber = subscribers[i];

    if (i === subscribers.length - 1) {
      recipient = subscribers[0];
    } else {
      recipient = subscribers[i + 1];
    }

    subscriber.recipient = recipient.email;
    subscriber.sent = false;
  }

  this.saveSubscribers(subscribers);

  return subscribers;
};

SecretSanta.prototype.resendRecipientList = function () {
  const list = this.getSubscribers();
  this.sendEmails(list);

  return list;
};

SecretSanta.prototype.sendEmails = function (recipientList) {
  const ejs = require('ejs');

  let messageBody = 'Hi <%= name %>!\n\n';
  messageBody += 'Here is your Secret Santa drawing:\n\n';
  messageBody += 'You have been given <%= recipient %>. They like <%=colour%> things and prefer <%=animal%>.\n';
  messageBody += 'They suggested: <%=idea%> as a potential gift.\n\n';
  messageBody += 'Remember the deadline is <%=deadline%> and the spend limit is <%=spendLimit%>\n\n';
  messageBody += 'Happy shopping, and have a Merry Christmas!!';

  const subject = 'Your Secret Santa drawing';
  let subscriber;
  let message;
  let delay;

  this.markEmailsAsSent();

  for (let i = 0; i < recipientList.length; i++) {
    subscriber = recipientList[i];

    if (subscriber.sent) {
      continue;
    }

    delay = 1000 * i;

    let recipient = this.findSubscriber(recipientList, subscriber.recipient);

    if (recipient) {
      message = ejs.render(messageBody, {
        name: subscriber.name,
        recipient: recipient.name,
        colour: recipient.colour,
        animal: recipient.animal,
        idea: recipient.idea,
        deadline: this.fetchConfig()['deadline'],
        spendLimit: this.fetchConfig()['spend-limit']
      });

      setTimeout(this.sendEmail.bind(this, subscriber.email, subject, message), delay);
    }
  }
};

SecretSanta.prototype.sendEmail = function (to, subject, messageBody) {
  let success = false;
  const config = this.fetchConfig()['email-server'];
  const subscribers = this.getSubscribers();
  const subscriber = this.findSubscriber(subscribers, to);

  if (config.type === 'mailgun') {
    const mailgun = require('mailgun-js')({
      apiKey: config['api-key'],
      domain: config.domain
    });

    mailgun.messages().send({
      from: 'Secret Santa <' + config['from-address'] + '>',
      to: to,
      subject: subject,
      text: messageBody
    }, function (err) {
      if (err) {
        console.error('Error sending to:' + to, err);
      } else {
        console.log('Email sent: ' + to);
      }
      success = !err;
    });
  } else if (config.type === 'smtp') {
    const nodemailer = require('nodemailer');

    if (!this.mailTransport) {
      this.mailTransport = nodemailer.createTransport(config['options']);
    }

    this.mailTransport.sendMail({
      from: config['from-address'],
      to: to,
      subject: subject,
      text: messageBody
    }, function (error, info) {
      if (error) {
        console.error('Error sending to:' + to, error);
        success = false;
      } else {
        console.log('Email sent: ' + info.response);
        success = true;
      }
    });
  } else {
    console.error('Unknown email server type:');
  }

  subscriber.sent = success;
  this.saveSubscribers(subscribers);
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

SecretSanta.prototype.findSubscriber = function (list, email) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].email === email) {
      return list[i];
    }
  }
};

module.exports = new SecretSanta();
