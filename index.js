var express = require('express');
var app = express();
var engine = require('ejs-locals');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var secretSanta = require('./app/lib/secret-santa');

if (!secretSanta.configExists()) {
  console.warn('No config detected...');
  secretSanta.runInstall();
}
else {
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
    if (req.param('password') === secretSanta.fetchConfig()['admin-password']) {
      secretSanta.initSession(req, res);
      res.redirect('/admin');
      next();
    }
    else {
      res.render('login', {
        error: 'Incorrect password'
      })
    }
  });

  app.get('/admin', secretSanta.ensureLoggedIn, function (req, res) {
    res.render('admin', {
      emailsSent: false,
      subscribers: secretSanta.getSubscribers()
    });
  });

  app.post('/admin', secretSanta.ensureLoggedIn, function (req, res) {
    secretSanta.sendEmails();
    res.render('admin', {
      emailsSent: true,
      subscribers: []
    });
  });

  var port = 3000; //process.env.PORT

  var server = app.listen(port, process.env.IP, function () {
    console.log('Listening on port %d', server.address().port);
  });
}