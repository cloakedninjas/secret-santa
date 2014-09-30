var SecretSanta = function (opts) {
  this.configFile = __dirname + '/../config/config.json';
  this.database = __dirname + '/../../data/storage.json';
};

SecretSanta.prototype.DB_KEY = 'subscribers';

SecretSanta.prototype.fetchConfig = function () {
  return require(this.configFile);
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
    animal: req.param('animal')
  });
  db.set(this.DB_KEY, currentSubscribers);
};

SecretSanta.prototype.sendEmails = function () {
  var ejs = require('ejs');

  var messageBody = 'Hi <%=name%>!\n\n';
  messageBody += 'Here is your Secret Santa drawing:\n\n';
  messageBody += 'You have been given <%=recipient%>. They like <%=colour%> things and prefer <%=animal%>.\n';
  messageBody += 'They would adore a <%=colour%> <%=animal%> - see if you can get one for under <%=spendLimit%>\n\n';
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
      spendLimit: 100
    });

    this.sendEmail(subscriber.email, subject, messageBody)
  }
};

SecretSanta.prototype.sendEmail = function (to, subject, messageBody) {
  if (this.fetchConfig()['email-server'] === 'mailgun') {
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
  }
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


module.exports = new SecretSanta();