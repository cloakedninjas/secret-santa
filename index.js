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

app.get('/login', function (req, res, next) {
  res.render('login');
  next();
});

app.post('/save', function (req, res, next) {

  var JSONStore = require('json-store');
  var db = JSONStore(__dirname + '/data/data.json');

  var key = 'registrants';
  var current = db.get(key);

  if (current === undefined) {
    current = [];
  }

  var newUser = {
    foo: 'bar',
    name: req.param('name'),
    email: req.param('email'),
    colour: req.param('colour'),
    animal: req.param('animal')
  };

  current.push(newUser);
  db.set(key, current);

  res.render('registered');

  next();
});

app.get('/send', function (req, res, next) {
  res.render('send');
  next();
});



var server = app.listen(3000, function () {
  console.log('Listening on port %d', server.address().port);
});