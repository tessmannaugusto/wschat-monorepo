const socket = new io('ws://localhost:3500');

const activity = document.querySelector('.activity');
const msgInput = document.querySelector('input');


function sendMessage(e){
  e.preventDefault();
  if (msgInput.value) {
    socket.emit('message', msgInput.value);
    msgInput.value = '';
  }
  msgInput.focus();
}

document.querySelector('form').addEventListener('submit', sendMessage);

// Listen for messages

socket.on('message', ( data ) => {
  const li = document.createElement('li');
  li.textContent = data;
  document.querySelector('ul').appendChild(li);
})