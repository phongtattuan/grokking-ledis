var express = require('express');
var bodyParser = require('body-parser');
var ledis = require('./lib/ledis');

var app = express();

// json body parser
app.use(bodyParser.json());

// remove X-Powered-By
app.use(function (req, res, next) {
  res.removeHeader('X-Powered-By');
  next();
});

// error handler
app.use(function (err, req, res, next) {
  if(err) {
    return res.send({'response': 'EINV'});
  }

  return next();
});

/* Routes */
app.get('/', function (req, res) {
  res.send('Welcome to Ledis@Idiots');
});

app.post('/ledis', function (req, res) {
  var command = req.body.command || '';
  var args = command.trim().split(' ').filter(function(arg) {
    return !!arg;
  });

  command = args[0];
  args = args.slice(1);

  var options = {
    memoryLimit: 1024
  };

  if (command && command.toUpperCase() == 'HELP') {
    res.send(ledis.help());
  }
  else {
    ledis.execute(command, args, options, function (response) {
      res.json({'response': response});
    });
  }
});

// Start server
var port = 8080;

var server = app.listen(port, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Ledis listening at http://%s:%s', host, port);
});
