var SecretSanta = function (opts) {

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

module.exports = new SecretSanta();