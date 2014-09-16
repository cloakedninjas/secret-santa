var SecretSanta = function (opts) {

};

SecretSanta.prototype.checkSession = function (req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/login');
  }
};

module.exports = SecretSanta;