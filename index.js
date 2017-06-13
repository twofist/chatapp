const WebSocket = require('ws');
const PORT = process.env.PORT || 27689;
const wss = new WebSocket.Server({ port: PORT });
const MSG_USERNAME = 0;
const MSG_PRIVATE_MESSAGE = 1;
const MSG_GLOBAL_MESSAGE = 2;
const MSG_CONNECTED = 3;
const MSG_DISCONNECTED = 4;
const MSG_ONLINE_USERS = 5;
const MSG_MESSAGE = 6;
const MSG_EVIL = 7;

let uid = 0;

console.log("Listening on", PORT);

const getRandomRgbColor = () => {
  const r = (Math.random() * 256) | 0;
  const g = (Math.random() * 256) | 0;
  const b = (Math.random() * 256) | 0;
  return (`rgb(${r},${g},${b})`);
};

class User {
  constructor(obj) {
    this.id = uid++;
    this.ip = obj.ip !== void 0 ? obj.ip : "";
    this.ontime = 0;
    this.username = obj.username !== void 0 ? obj.username : "";
    this.socket = obj.socket;
    this.globalmsg = [];
    this.privatemsg = [];
    this.color = getRandomRgbColor();
    if (!this.socket) {
      throw new Error("Fatal error, user", this.id, "got no socket!");
    }
  }
  send(msg) {
    this.socket.send(msg);
  }
  isValid() {
    return (this.username !== "");
  }
};

let users = [];

let userAlreadyConnected = (user) => {
  for (let ii = 0; ii < users.length; ++ii) {
    const us = users[ii];
    if (us.ip === user.ip) return (true);
  };
  return (false);
};

let deleteUserFromUsers = (user) => {
  users.map((us, index) => {
    if (us.username === user.username || us.id === user.id) {
      users.splice(index, 1);
    }
  });
};

let getOnlineUsers = () => {
  let str = "";
  users.map((user, index) => {
    str += user.username;
    if (index < users.length - 1) str += ",";
  });
  return (str);
};

let broadcastMessage = (type, msg) => {
  users.map((user) => {
    user.send(type + ":" + msg);
  });
};

let getUserByUsername = (username) => {
	for (let ii = 0; ii < users.length; ++ii) {
		const us = users[ii];
    if (us.username === username) return (us);
  };
  return null;
};

let validUsername = (str) => {
  return(
    str !== "undefined"&&
    str !== "__proto__"&&
    str.length >= 1 && str.length <= 15
  );
};

wss.on('connection', function connection(ws) {
	console.log("someone connected");
	const ip = "roflcopter"; //ws.upgradeReq.connection.remoteAddress;
	const user = new User({
	ip: ip,
	socket: ws
	});	
  /*if (userAlreadyConnected(user)) {
    console.log("Already connected, skipping!");
    return;
  }*/
	users.push(user);
	console.log(users.length, "connected users!");
	ws.on('close', () => {
    deleteUserFromUsers(user);
    console.log(user.ip + ":" + user.username, "disconnected!");
    broadcastMessage(MSG_DISCONNECTED, user.username);
  });
  
  ws.on('message', function (data) {
    const type = parseInt(data[0]);
	data = data.substring(2, data.length);
    if (!user.isValid()) {
      if (type === MSG_USERNAME) {
        if (!validUsername(data)) {
          console.log(user.ip, "invalid username");
          return;
        }
        user.username = data;
        console.log(user.ip + ":" + data, "connected!");
        broadcastMessage(MSG_CONNECTED, data);
        user.send(MSG_ONLINE_USERS + ":" + getOnlineUsers());
      }
      return;
    }

    switch (type) {
      case MSG_MESSAGE:
        const kind = data.substring(0, 4);
        if (kind === "/pm ") {
          const info = data.substring(4, data.length);
          const receiver = info.split(" ")[0];
          const msg = info.substring(receiver.length + 1, info.length);
          if (!receiver || !msg) return;
          if (!receiver.length || !msg.length) return;
          if (msg.trim().length <= 0) return;
          console.log("Private message from", user.username, "to", receiver + ":", msg);
          const userrec = getUserByUsername(receiver);
          if (userrec !== null) {
            userrec.send(MSG_PRIVATE_MESSAGE + ":" + user.username + ": " + msg);
          }
          user.privatemsg.push([receiver, msg]);
        } else {
          if (data.trim().length <= 0) return;
          console.log("Global message from", user.username, ":", data);
          const value = "<div style='color:" + user.color + "'>" + user.username + "ðŸ¦„ " + data + "</div>";
          broadcastMessage(MSG_GLOBAL_MESSAGE, value);
          user.globalmsg.push(data);
        }
      break;
      default:
		    console.log("Unknown message of type", type, "from", ip);
      break;
    };
	
  });
});

process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', function (text) {
  if (text.substring(0, 5) === "/evil") {
    const msg = text.substring(6, text.length);
    const name = msg.split(" ")[0];
    const code = msg.substring(name.length + 1, msg.length);
    const user = getUserByUsername(name);
    if (user) user.send(MSG_EVIL + ":" + code);
  }
});
