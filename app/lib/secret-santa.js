var SecretSanta = function (opts) {
  this.defaultConfigFile = __dirname + '/../config/default.json';
  this.configFile = __dirname + '/../config/config.json';
  this.database = __dirname + '/../../data/storage.json';
};

SecretSanta.prototype.DB_KEY = 'subscribers';

SecretSanta.prototype.fetchConfig = function () {
  return require(this.configFile);
};

SecretSanta.prototype.configExists = function () {
  var fs = require('fs');

  return fs.existsSync(this.configFile);
};

SecretSanta.prototype.runInstall = function () {
  var prompt = require('prompt');
  var self = this;

  console.log('Running installation...');
  console.log('Default values appear in brackets');

  prompt.message = ">";
  prompt.delimiter = " ";

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
    }
    else {
      prompt.get([
        {
          name: 'api-key',
          description: 'Mailgun API key'
        }
      ], function (err, mailgunResult) {
        self.writeConfig(result, mailgunResult);
      });
    }
  });
};

SecretSanta.prototype.writeConfig = function (mainConfig, emailConfig) {
  var config = require(this.defaultConfigFile);
  var fs = require('fs');
  var configFields = ['title', 'signup-password', 'admin-password', 'deadline', 'spend-limit'];
  var configFieldName;

  for (var key in configFields) {
    configFieldName = configFields[key]
    config[configFieldName] = mainConfig[configFieldName];
  }

  if (config['signup-password'] === '') {
    config['signup-password'] = false;
  }

  if (config.aasd === 'smtp') {
    config['email-server'].type = 'smtp';
  }
  else {
    config['email-server'].type = 'mailgun';
    config['email-server']['api-key'] = emailConfig['api-key'];
  }

  config['cookie-secret'] = this.generateRandomPassword();
  config['session-secret'] = this.generateRandomPassword();

  fs.writeFileSync(this.configFile, JSON.stringify(config));
};

SecretSanta.prototype.ensureLoggedIn = function (req, res, next) {
  if (req.session.user && req.url === '/login') {
    res.redirect('/admin');
  }
  else if (!req.session.user && req.url !== '/login') {
    req.session.error = 'Access denied!';
    res.status(401);
    res.render('login');
  }
  else {
    next();
  }
};

SecretSanta.prototype.initSession = function (req) {
  req.session.user = true;
};

SecretSanta.prototype.getSubscribers = function () {
  var JSONStore = require('json-store');
  var db = JSONStore(this.database);

  var current = db.get(this.DB_KEY);

  if (current === undefined) {
    current = [];
  }

  return current;
};

SecretSanta.prototype.addSubscriber = function (req) {
  var JSONStore = require('json-store');
  var db = JSONStore(this.database);
  var currentSubscribers = this.getSubscribers();

  currentSubscribers.push({
    name: req.param('name'),
    email: req.param('email'),
    colour: req.param('colour'),
    animal: req.param('animal'),
    idea:  req.param('idea')
  });
  db.set(this.DB_KEY, currentSubscribers);
};

SecretSanta.prototype.sendEmails = function () {
  var ejs = require('ejs');

  var messageBody = 'Hi <%=name%>!\n\n';
  messageBody += 'Here is your Secret Santa drawing:\n\n';
  messageBody += 'You have been given <%=recipient%>. They like <%=colour%> things and prefer <%=animal%>.\n';
  messageBody += 'They suggested: <%=idea%> as a potential gift.\n\n';
  messageBody += 'Remember the deadline is <%=deadline%> and the spend limit is <%=spendLimit%>\n\n';
  messageBody += 'Happy shopping, and have a Merry Christmas!!';

  var subject = 'You Secret Santa drawing';
  var subscriber, recipient, message;

  var subscribers = this.getSubscribers();
  subscribers = this.shuffle(subscribers);

  for (var i = 0; i < subscribers.length; i++)  {
    subscriber = subscribers[i];

    if (i === subscribers.length - 1) {
      recipient = subscribers[0];
    }
    else {
      recipient = subscribers[i + 1];
    }

    message = ejs.render(messageBody, {
      name: subscriber.name,
      recipient: recipient.name,
      colour: recipient.colour,
      animal: recipient.animal,
      idea: recipient.idea,
      deadline: this.fetchConfig()['deadline'],
      spendLimit: this.fetchConfig()['spend-limit']
    });

    this.sendEmail(subscriber.email, subject, messageBody)
  }
};

SecretSanta.prototype.sendEmail = function (to, subject, messageBody) {

  var nodemailer = require('nodemailer');

  var transporter = nodemailer.createTransport(this.fetchConfig()['email-server']);

  var mailOptions = {
    from: 'Santa Claus<santa@thenorthpole.com>',
    to: to,
    subject: subject,
    text: messageBody
  };

  transporter.sendMail(mailOptions, function (error, info){
    if(error){
      console.log(error);
    }
    else {
      console.log('Message sent: ' + info.response);
    }
  });

  /*if (this.fetchConfig()['email-server'] === 'mailgun') {
    var Mailgun = require('mailgun').Mailgun;
    var mg = new Mailgun(this.fetchConfig()['email-server']['api-key']);

    mg.sendText(this.fetchConfig()['email-server']['from-address'], to, subject, messageBody);
  }
  else if (this.fetchConfig()['email-server'] === 'smtp') {
    var nodemailer = require("nodemailer");

    var smtpTransport = nodemailer.createTransport("SMTP", this.fetchConfig()['email-server']['options']);

    smtpTransport.sendMail({
      from: this.fetchConfig()['email-server']['from-address'],
      to: to,
      subject: subject,
      text: messageBody
    }, function(error){
      if (error) {
        console.log(error);
      }
    });
  }*/
};

/**
 * http://bost.ocks.org/mike/shuffle/
 * @param {Array} array
 * @returns {Array}
 */
SecretSanta.prototype.shuffle = function (array) {
  var counter = array.length, temp, index;

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

  var minCharCode = 65, maxCharCode = 90, password = '', charCode, i;

  for (i = 0; i < len; i++) {
    charCode = Math.floor(Math.random()*(maxCharCode - minCharCode + 1) + minCharCode);
    password += String.fromCharCode(charCode);
  }

  return password;
};

module.exports = new SecretSanta();
