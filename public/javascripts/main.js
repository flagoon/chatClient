$(document).ready(function() {

  const input = $('#input');
  const screen = $('#screen');
  const logScreen = $('#log');
  const userBlock = $('#userBlock');
  const loginInput = $('#login-input');
  const socket = io();

  function getTime() {
    let time = new Date().toLocaleTimeString();

    //to remove AM/PM from time
    timeRegEx = /[a-z ]/gi;
    return time.replace(timeRegEx, '');
  }

  //serwer is sending JSON object with all users in database, this function show them on the list
  function showAllUsers (users) {
    for (let user in users) {
      userBlock.append($('<li>').html(user));
    }
  }

  function showHidden() {
    $('#login-form').addClass('invisible');
    screen.removeClass('invisible');
    logScreen.removeClass('invisible');
    $('#input-form').removeClass('invisible');
  }

  function writeHistory (data) {
    $.each(data, (key, val) => {
      screen.append($('<div class="text-muted p-1">').text(val));
    });
    screen.append($('<hr/>'));
  }

  function testNick(nick) {
    let nickRegex = /^([a-zA-Z]){1}[a-zA-Z_]+$/;
    return nickRegex.test(nick);
  }

  //login in with small validation
  $('#login-form').submit((e) => {
    e.preventDefault();

    //we are sending value of the login input. Then, on server side we will check is nickname exists, and send back
    //a call back. That way we can remove some unnecessary steps.
    if(testNick(loginInput.val())) {
      socket.emit('newLogin', loginInput.val(), (callback) => {
        if (callback.action === 'showAll') {
          showHidden();
          writeHistory(callback.history);
        } else {
          loginInput.attr('placeholder', 'This nick already exists');
          loginInput.addClass('login-error');
          loginInput.val('');
        }
      });
    } else {
      loginInput.val('');
      loginInput.attr('placeholder', 'Only letters and underscore. Starts with underscore');
      loginInput.addClass('login-error');
    }
  });

  //socket to show all logged users
  socket.on('usernames', (users)=> {
    userBlock.empty();
    showAllUsers(users);
  });

  socket.on('wrongNick', (nick) => {
    logScreen.prepend($('<div class="bg-warning text-danger p-1 my-1">').html(nick + ' is already taken.'));
  });

  //response from server, what to do when server is broadcasting that someone connected
  socket.on('connected', (nick) => {
    let time = getTime();
    if (!logScreen.hasClass('invisible')) {
      logScreen.prepend($('<div class="text-success p-1 my-1">').text(time + ' ' + nick + ':  connected'));
    }
  });

  //show information, that someone logout.
  socket.on('disconnect', (nickname) => {
    let time = getTime();

    if(!logScreen.hasClass('invisible')) {
      logScreen.prepend($('<div class="text-danger p-1 my-1">').text(time + ' ' + nickname + ': disconnected'));
    }
  });

  //while submitting form
  $('#input-form').submit( () => {

    //i need to rewrite all of this

    //if there is nothing in input, don't send request
    if (input.val() === '') {
      return false
    }

    //Help instructions. No need to send to server. Just show them to the user
    if (newInput === '/help') {
      logScreen.prepend($('<div class="text-primary p-1 my-1">').text('Write: /setTime value_in_seconds to change period for keeping chat history'));
      logScreen.prepend($('<div class="text-primary p-1 my-1">').text('Write: /nick #new_nick to change nickname. Name should be 3-15 signs and only letters'));

      input.val('');

      return false;
    }

    //function to set nickname and join
    if (newInput.indexOf('/nick ') === 0) {
      //should be /nick #newNick, where new nick is word, only letters, from 3-15. regEx is looking

      let nameRegEx = /#([a-z](\w+))/i;
      let newLogin = newInput.match(nameRegEx);
      if (newLogin !== null) {
        socket.emit('changeNick', newLogin[0].replace('#',''));
      } else {
        logScreen.prepend($('<div class="text-white bg-danger p-1 my-1">').text('There was not viable nick. You should use /nick #nick_name. Nickname should start with letter and contains only letters, numbers and underscore'));
      }
      input.val('');
      return false;

    } else if (newInput.indexOf('/setTime ') === 0) {
      //regex to find first numeric value
      let timeRegEx = /[0-9]+/i;

      //timeVal will be send to server. It's a number. If no correct value is give, 0 will be sent.
      let timeVal = Number(newInput.match(timeRegEx));
      socket.emit('changeTime', timeVal);
      input.val('');
      return false;

      //this part is for errors
    } else if (newInput.indexOf('/') === 0) {
      input.val('');
      logScreen.prepend($('<div class="text-white bg-danger p-1 my-1">').html('Command not found, try <strong>/help</strong> for commands'));
      return false;
    }



    //************************************************************************************
    //part responsible for sending normal text
    //************************************************************************************
    //socket (client) emits value of the input to server => 1

    let sentText = getTime() + ': ' + newInput;

    socket.emit('sendText', sentText);
    screen.append($('<p>').html('<span>Me: </span>' + sentText));

    //this part is to move scroll down on new msg
    screen.scrollTop(screen[0].scrollHeight);
    input.val('');
    return false;
  });

  //we dont need this
  socket.on('changedNick', (data) => {
    logScreen.prepend($('<div class="text-default p-1 my-1">').html('User <span class="text-danger">' + data.oldNick + '</span> changed nickname to <span class="text-danger">' + data.newNick + '</span>'));
  });

  //receive text from server
  socket.on('sendResponse', (response) => {

    if(!screen.hasClass('invisible')) {
      screen.append($('<div class="text-primary bg-warning p-1">').html(response));
    }
    screen.scrollTop(screen[0].scrollHeight);
  });
});