var server = require('http').createServer();
var io = require('socket.io')(server);
var serverconf = require('./serverconf')

//random Code generator
function randomInt(low, high) 
{ 
    return Math.floor(Math.random()*(high-low+1)) + low; 
}  
function randomChar(str) 
{
    return str.charAt(randomInt(0, str.length-1)); 
}
function generateRandSeq()
{
    var i, seq = "";
    for (i = 1; i <= 4; i = i + 1) {
        seq += randomChar("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    }
    return seq;
}

//initialise roomlist
var rooms = {};
function Player(id, name) {
    this.id = id;
    this.name = name;
    this.pos = {x: 0, y: 0, z: 0};
    this.hasItem = false;
    this.alive = true;
}
function Room(name) {
    this.name = name;
    this.players = {};
    this.playerCount = 0;
    this.items = [];
    this.itemCount = 0;
    this.curItemId = 0;
    this.alive = true;
    this.AddPlayer = function(id, name) {
        this.players[id] = new Player(id, name);
        this.playerCount++;
    };
    this.AddItem = function(posX, posY, posZ) {
        this.items[this.curItemId++] = new Item(posX, posY, posZ);
        this.itemCount++; 
    };
    this.RemoveItem = function(id) {
        this.items.splice(this.items.findIndex(id), 1);
        this.itemCount--;
    };
}
function Item(posX, posY, posZ) {
    this.pos = {x: posX, y: posY, z: posZ};
}

//socket logic
io.sockets.on('connection', function(socket) {
    socket.admin = false;
    socket.on('isAdmin', function(data) {
        if(data == serverconf.pwd) {
            socket.admin = true;
            socket.emit('promote');
        } else {
            socket.emit('denied', "Nice try, kiddo!");
        }
    });
    
    socket.on('start', function() {
        socket.broadcast.emit('gameStart');
    });
    socket.on('reset', function() {
        if(socket.admin) {
            rooms = {};
            Object.keys(io.sockets.sockets).forEach(key => {
                if(Object.keys(io.sockets.sockets[key].rooms).length > 1) {
                    io.sockets.sockets[key].leave(io.sockets.sockets[key].rooms[1]);
                }
            });
            socket.emit('rooms', rooms);
        }
    });
    socket.on('createRoom', function(data) {
        if(socket.admin) {
            while(true) {
                var code = generateRandSeq();
                if(!(code in rooms)) {
                    rooms[code] = new Room(data);
                    socket.emit('rooms', rooms);
                    break;
                }
            }
        }
    });
    socket.on('initialize', function(data) {
        if(data.code in rooms) {
            if(rooms[data.code].players != undefined && rooms[data.code].playerCount < 4) {
                socket.join(data.code, function() {
                    rooms[data.code].AddPlayer(socket.id, data.name);
                    socket.emit('room', {name: rooms[data.code].name, position: rooms[data.code].playerCount});
                });
            } else {
                socket.emit('denied', "Room is already full!");
            }
        } else {
            socket.emit('denied', "Room is not yet created!");
        }
    });
    socket.on('itemPickUp', function(id) {
        if(id in rooms[socket.rooms[1]].items && rooms[socket.rooms[1]].players[socket.id].hasItem == false) {
            rooms[socket.rooms[1]].RemoveItem(id);
            rooms[socket.rooms[1]].players[socket.id].hasItem = true;
            socket.to(rooms[socket.rooms[1]]).emit('itemPickUpOther', {playerId: socket.id, itemId: id});
            socket.emit('itemPickUpYou', id);
        }
    });
    socket.on('itemDropChute', function(id) {

    });
    socket.on('itemDropHeater', function() {

    });
    socket.on('updatePosition', function(pos) {

    });
});

//server
console.log ('Server started.');
server.listen(3000);