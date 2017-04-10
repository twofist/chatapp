const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

// Broadcast to all.
/*wss.broadcast = function broadcast(data) 
{
  wss.clients.forEach(function each(client) 
  {
    if (client.readyState === WebSocket.OPEN) 
	{
      client.send(data);
    }
  });
};*/

const MSG_USERNAME = 0;
const MSG_PRIVATE_MESSAGE = 1;
const MSG_GLOBAL_MESSAGE = 2;
const MSG_CONNECTED = 3;
const MSG_DISCONNECTED = 4;
const MSG_ONLINE_USERS = 5;

let uid = 0;

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

let validUsername = (str) => {
  return(
    str !== "undefined"&&
    str !== "__proto__"&&
    str.length >= 1 && str.length <= 15
  );
};

wss.on('connection', function connection(ws) {
	
	const ip = ws.upgradeReq.connection.remoteAddress;
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
	
    if (!user.isValid()) {
      if (type === MSG_USERNAME) {
        const name = data.split(":")[1];
        if (!validUsername(name)) {
          console.log(user.ip, "invalid username");
          return;
        }
        user.username = name;
        console.log(user.ip + ":" + name, "connected!");
        broadcastMessage(MSG_CONNECTED, name);
        user.send(MSG_ONLINE_USERS + ":" + getOnlineUsers());
      }
      return;
    }
	
    const info = data.split(":")[1];
	
    switch (type) {
      // pm
	  case MSG_PRIVATE_MESSAGE:
	  
		const newinfo = info.replace(" ",":");
		const receiver = newinfo.split(":")[1];
		const msg = newinfo.split(" ");
		console.log("pm from:", user.username, ";to:", receiver, ";msg:", msg);
		
		broadcastMessage(MSG_PRIVATE_MESSAGE, user.username + ", " + info);
		
	/*	wss.clients.forEach(function each(client) {
		  if (client === receiver.socket) {
			broadcastMessage(MSG_PRIVATE_MESSAGE, user.username, receiver + ", " + info);
		  }
		});*/
		user.privatemsg.push("ip: " + user.ip + " ;name: " + user.username + " ;msg: " + info + " ;to: " + receiver);
		console.log("privatemsg", user.privatemsg);
      break;
      // global message
      case MSG_GLOBAL_MESSAGE:
        console.log("Global message from", user.username, ":", info);
        broadcastMessage(MSG_GLOBAL_MESSAGE, user.username + ", " + info);
		user.globalmsg.push("ip: " + user.ip + " ;name: " + user.username + " ;msg: " + info);
		console.log("globalmsg", user.globalmsg);
      break;
      default:
        console.log(user.id + ":" + ip, "is cheating!");
      break;
    };
	
  });
});
