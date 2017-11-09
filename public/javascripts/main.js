$(document).ready(function() {

  const input = $('#input');
  const screen = $('#screen');
  const logScreen = $('#log');
  const socket = io();

  function getTime() {
    let time = new Date().toLocaleTimeString();

    //to remove AM/PM from time
    timeRegEx = /[a-z ]/gi;
    return time.replace(timeRegEx, '');
  }

  //response from server, what to do when server is broadcasting that someone connected
  socket.on('connected', () => {


    let time = getTime();

    logScreen.removeClass('hide-log');
    logScreen.addClass('log-screen');
    logScreen.prepend($('<p class="text-success">').text(time + ': User connected'));

  });

  //show information, that someone logout
  socket.on('disconnect', () => {
    let time = getTime();
    logScreen.prepend($('<p class="text-danger">').text(time + ': User disconnected'));
  });

  //while submitting form
  $('form').submit( () => {

    let newInput = input.val();

    //if there is nothing in input, don't send request
    if (newInput === '') {
      return false
    }

    //Help instructions. No need to send to server. Just show them to the user
    if (newInput === '/help') {
      logScreen.prepend($('<p class="text-primary">').text('Write: /setTime value_in_seconds to change period for keeping chat history'));
      logScreen.prepend($('<p class="text-primary">').text('Write: /nick new_nick to change nickname. Name should be 3-15 signs and only letters'));

      input.val('');

      return false;
    }

    //function to set nickname and join
    if (newInput.indexOf('/nick ') === 0) {
      //should be /nick #newNick, where new nick is word, only letters, from 3-15. regEx is looking
      let nameRegEx = / [a-z]{3,15}/i;
      let newLogin = newInput.match(nameRegEx);
      newLogin = newLogin[0].replace(' ','');
      socket.emit('changeNick', newLogin);
      input.val('');
      return false;

    } else if (newInput.indexOf('/setTime ') === 0) {
      //regex to find first numeric value
      let timeRegEx = /[0-9]+/i;

      //timeVal will be send to server. It's a number.
      let timeVal = Number(newInput.match(timeRegEx));
      socket.emit('changeTime', timeVal);
      input.val('');
      return false;

      //this part is for errors
    } else if (newInput.indexOf('/') === 0) {
      input.val('');
      logScreen.prepend($('<p class="text-white bg-danger">').html('Command not found, try <strong>/help</strong> for commands'));
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

  socket.on('changedNick', (data) => {
    logScreen.prepend($('<p class="text-default">').html('User <span class="text-danger">' + data.oldNick + '</span> changed nickname to <span class="text-danger">' + data.newNick + '</span>'));
  });

  //receive text from server
  socket.on('sendResponse', (response) => {
    screen.append($('<p class="text-primary bg-warning">').html(response));
    screen.scrollTop(screen[0].scrollHeight);
  });

  socket.on('sendHistory', (data) => {
    if (data[0] === undefined) {
      return false;
    }
    for (let i = 0; i < data.length; i++) {
      screen.append($('<p class="text-muted">').html(data[i]));
    }
    screen.append($('<hr/>'));
  })
});