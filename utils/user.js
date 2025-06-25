let users = [];


const addUser = ({ name, userId, roomId, host, presenter, socketId }) => {
  const user = { name, userId, roomId, host, presenter, socketId };
  users.push(user);
  return users.filter((u) => u.roomId === roomId);
};


const removeUser = (socketId) => {
  const index = users.findIndex((u) => u.socketId === socketId);
  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
};


const getUser = (socketId) => {
  return users.find((u) => u.socketId === socketId);
};


const getUsersByRoom = (roomId) => {
  return users.filter((u) => u.roomId === roomId);
};

module.exports = {
  addUser,
  removeUser,
  getUser,
  getUsersByRoom,
};
