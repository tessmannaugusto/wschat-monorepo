import express from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3500;
const ADMIN = "Admin";

const app = express();

app.use(express.static(path.join(__dirname, "public")));

const expressServer = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// state
const UsersState = {
  users: [],
  setUsers: function (newUsersArray) {
    this.users = newUsersArray;
  },
};

const io = new Server(expressServer, {
  cors: {
    origin:
      process.env.NODE_ENV === "production" ? false : ["http://localhost:5500"],
  },
});

io.on("connection", (socket) => {
  console.log(`User ${socket.id} connected`);

  // Upon connection - only to user
  socket.emit("message", buildMsg(ADMIN, `Welcome to the chat!`));

  socket.on("enterRoom", ({ name, room }) => {
    // leave a previous room
    const prevRoom = getUser(socket.id)?.room;
    if (prevRoom) {
      socket.leave(prevRoom);
      io.to(prevRoom).emit("message", buildMsg(ADMIN, `${name} left the room`));
    }

    const user = activateUser(socket.id, name, room);

    if (prevRoom) {
      io.to(prevRoom).emit("userList", {
        users: getUsersInRoom(prevRoom),
      });
    }

    // Join room
    socket.join(user.room);

    // To user who joined
    socket.emit("message", buildMsg(ADMIN, `Welcome to ${user.room}`));

    // to everyone else
    socket.broadcast
      .to(user.room)
      .emit("message", buildMsg(ADMIN, `${user.name} has joined the room`));

    // update user list for new room
    io.to(user.room).emit("userList", {
      users: getUsersInRoom(user.room),
    });

    // Update room list for everyone
    io.emit("roomList", {
      rooms: getAllActiveRooms(),
    });
  });

  // When user disconnects - to all others
  socket.on("disconnect", () => {
    const user = getUser(socket.id);
    deactivateUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        "message",
        buildMsg(ADMIN, `${user.name} has left the room`)
      );
      io.to(user.room).emit("userList", {
        users: getUsersInRoom(user.room),
      });
      io.emit('roomList', {
        rooms: getAllActiveRooms()
      })
    }
    console.log(`User ${socket.id} disconnected`);
  });

  // Listening for a message event
  socket.on("message", ({name, text}) => {
    const room = getUser(socket.id)?.room;
    if (room) {
      io.to(room).emit('message', buildMsg(name, text));
    }
  });

  // Listening for activity event
  socket.on("activity", (name) => {
    const room = getUser(socket.id)?.room;
    if (room) {
      socket.broadcast.to(room).emit('activity', name);
    }
  });
});

function buildMsg(name, message) {
  return {
    name,
    message,
    time: new Intl.DateTimeFormat("default", {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    }).format(new Date()),
  };
}

// User functions
function activateUser(id, name, room) {
  const user = {
    id,
    name,
    room,
  };
  UsersState.setUsers([
    ...UsersState.users.filter((user) => user.id !== id),
    user,
  ]);
  return user;
}

function deactivateUser(id) {
  UsersState.setUsers(UsersState.users.filter((user) => user.id !== id));
}

function getUser(id) {
  return UsersState.users.find((user) => user.id === id);
}

function getUsersInRoom(room) {
  return UsersState.users.filter((user) => user.room === room);
}

function getAllActiveRooms() {
  return [...new Set(UsersState.users.map((user) => user.room))];
}
