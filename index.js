const express = require('express');
const app = express();
const engine = require('ejs-locals');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const secretSanta = require('./app/lib/secret-santa');

if (!secretSanta.configExists()) {
  console.warn('No config detected...');
  secretSanta.runInstall();
} else {
  app.engine('ejs', engine);
  app.set('view engine', 'ejs');
  app.set('views', __dirname + '/app/views');

  app.use(express.static(__dirname + '/public'));
  app.use(bodyParser.urlencoded({extended: false}));
  app.use(cookieParser(secretSanta.fetchConfig()['cookie-secret']));
  app.use(session({
    secret: secretSanta.fetchConfig()['session-secret'],
    resave: true,
    saveUninitialized: false
  }));

  // routes

  app.get('/', function (req, res) {
    res.render('index', {
      title: secretSanta.fetchConfig()['title'],
      deadline: secretSanta.fetchConfig()['deadline'],
      spendLimit: secretSanta.fetchConfig()['spend-limit']
    });
  });

  app.post('/save', function (req, res) {
    secretSanta.addSubscriber(req);

    res.render('registered');
  });

  app.get('/login', secretSanta.ensureLoggedIn, function (req, res) {
    res.render('login');
  });

  app.post('/login', secretSanta.ensureLoggedIn, function (req, res, next) {
    if (req.body.password === secretSanta.fetchConfig()['admin-password']) {
      secretSanta.initSession(req, res);
      res.redirect('/admin');
      next();
    } else {
      res.render('login', {
        error: 'Incorrect password'
      });
    }
  });

  app.get('/admin', secretSanta.ensureLoggedIn, function (req, res) {
    res.render('admin', {
      subscribers: secretSanta.getSubscribers(),
      alreadySent: secretSanta.haveEmailsAlreadySent()
    });
  });

  app.post('/admin/create-send', secretSanta.ensureLoggedIn, function (req, res) {
    const list = secretSanta.createAndSendEmails();
    res.render('admin-review-send', {
      recipients: list
    });
  });

  app.post('/admin/re-send', secretSanta.ensureLoggedIn, function (req, res) {
    const list = secretSanta.resendRecipientList();
    res.render('admin-review-send', {
      recipients: list
    });
  });

  const port = process.env.PORT || 3000;

  const server = app.listen(port, process.env.IP, function () {
    console.log('Listening on port %d', server.address().port);
  });
}
