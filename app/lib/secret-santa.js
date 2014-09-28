var SecretSanta = function (opts) {
  this.database = __dirname + '/../../data/storage.json';
};

SecretSanta.prototype.DB_KEY = 'subscribers';

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

  var newUser = {
    name: req.param('name'),
    email: req.param('email'),
    colour: req.param('colour'),
    animal: req.param('animal')
  };

  currentSubscribers.push(newUser);
  db.set(this.DB_KEY, currentSubscribers);
};

module.exports = new SecretSanta();