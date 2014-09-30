var express = require('express');
var app = express();
var engine = require('ejs-locals');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var secretSanta = require('./app/lib/secret-santa');

app.engine('ejs', engine);
app.set('view engine', 'ejs');
app.set('views', __dirname + '/app/views');

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser('xhyuujj1456'));
app.use(session({
  secret: 'all glory to keyboard cat',
  resave: true,
  saveUninitialized: false
}));

// routes

app.get('/', function (req, res, next) {
  res.render('index');

  next();
});

app.post('/save', function (req, res, next) {

  secretSanta.addSubscriber(req);

  res.render('registered');

  next();
});

app.get('/login', secretSanta.ensureLoggedIn, function (req, res) {
  res.render('login');
});

app.post('/login', secretSanta.ensureLoggedIn, function (req, res, next) {
  if (req.param('password') === 'plop') { //TODO
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