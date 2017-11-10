const Promise = require("bluebird");

const path = require('path');
//const favicon = require('serve-favicon');
const logger = require('morgan');
const sassMiddleware = require('node-sass-middleware');

const express = require('express');
const app = express();

const server = app.listen(3000, () => {
  console.log("server started on port 3000");
});

const redis = Promise.promisifyAll(require("redis"));
const client = redis.createClient({host: 'localhost', port: 6379, password: 'zuzia123'});

const io = require('socket.io').listen(server);

const index = require('./routes/index');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(sassMiddleware({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: true, // true = .sass and false = .scss
  sourceMap: true
}));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);

io.on('connection', (socket) => {

  client.on('error', (err) => {
    console.log(err);
  });

  //get time value from database and remove all data that was stored before this time.
  client.getAsync('time').then((data) => {
    let limit = Date.now() - data * 1000;
    client.zremrangebyscore('chat', '-inf', '(' + limit);
  });

  //get data from redis, then send this data to client
  client.zrangeAsync('chat', '0', '-1').then((data) => {
    if (data.length > 0) {
      socket.emit('sendHistory', data)
    } else {
      console.log('No data to show');
    }
  });

  //when new user is connected, other clients receive information
  socket.broadcast.emit('connected');

  //this function listen to what IO is sending from client side. We receive 2 things from client side (an object).
  //newInput, which is a message content, and login, which is a name of person who sent it.
  socket.on('sendText', (msg) => {

    // when msg is received from client, add it to database

    msg = socket.nickname + ' ' + msg;

    let timeStamp = Date.now();
    client.zaddAsync('chat', timeStamp, msg).then(socket.broadcast.emit('sendResponse', msg));
  });


  socket.on('disconnect', () => {
    io.emit('disconnect');
  });

  socket.on('changeNick', (nick) => {

    client.hexistsAsync('users', nick).then((val) => {
      if (val === 0) {
        socket.broadcast.emit('changedNick', {'oldNick': socket.nickname, 'newNick': nick});
        socket.nickname = nick;

        client.hset('users', socket.nickname, '');

        io.emit('usernames');
      } else console.log('Nick already taken');
    });
  });


  //this code is saving setTime variable in database, so it's not resetting after each server shut down.
  socket.on('changeTime', (sentValue) => {
    client.getAsync('time').then((value) => {
      if (value) {
        client.set('time', sentValue);
        console.log('Time value was change to ' + sentValue + 's');
      }
      else console.log('error')
    });
  })

});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

function changeTimeLimit(val) {
  timeLimit =  val * 1000;
}

module.exports = app;