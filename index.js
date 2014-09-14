var express = require('express');
var app = express();
var engine = require('ejs-locals');

app.get('/', function (req, res, next) {
  res.render('index');
  next();
});

app.engine('ejs', engine);
app.set('view engine', 'ejs');
app.set('views', __dirname + '/app/views');

app.use(express.static(__dirname + '/public'));

var server = app.listen(3000, function () {
  console.log('Listening on port %d', server.address().port);
});