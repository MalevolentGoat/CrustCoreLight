var server = require('http').createServer();
var io = require('socket.io')(server);
var serverconf = require('./serverconf')
var events = require('events');

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
var rank = 0;
function Player(id, name) {
    this.id = id;
    this.name = name;
    this.pos = {x: 0, y: 0, z: 0};
    this.hasItem = false;
    this.droppingAt = null;
    this.pickingAt = null;
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
    this.AddItem = function() {
        this.curItemId++
        this.items[this.curItemId] = new Item(this.curItemId);
    };
    this.RemoveItem = function(id) {
        this.items[id] = null;
    };
}
function Item(id) {
    this.id = id;
}

var eventEmitter = new events.EventEmitter();

function Loop() {
    this.running = false;
    var interval;
    function tick() {
        if(this.running == false) {
            return;
        }
        eventEmitter.emit('tick');
    }
    this.start = function() {
        if(this.running) {
            return;
        }
        this.running = true;
        interval = setInterval(tick, 1000);
    }
    this.stop = function() {
        this.running = false;
        clearInterval(interval);
    }
}

var loop = new Loop();

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
        rank = Object.keys(rooms).length;
        io.emit('gameStart');
        loop.start();
    });
    socket.on('reset', function() {
        if(socket.admin) {
            rooms = {};
            rank = 0;
            loop.stop();
            itemSpawn = 0;
            increaseDifficulty = 0;
            Object.keys(io.sockets.sockets).forEach(key => {
                if(Object.keys(io.sockets.sockets[key].rooms).length > 1) {
                    io.sockets.sockets[key].leave(io.sockets.sockets[key].rooms[1]);
                }
            });
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
        if(rooms[socket.rooms[1]].items[id] != null && rooms[socket.rooms[1]].players[socket.id].hasItem == false) {
            rooms[socket.rooms[1]].RemoveItem(id);
            rooms[socket.rooms[1]].players[socket.id].hasItem = true;
            io.in(socket.rooms[1]).emit('itemDelete', id);
            io.in(socket.rooms[1]).emit('itemPickUp', socket.id);
        }
    });
    socket.on('itemDropChute', function(id) {
        if(rooms[socket.rooms[1]].players[socket.id].hasItem == true) {
            Object.keys(rooms[socket.rooms[1]].players).forEach(key => {
                if(rooms[socket.rooms[1]].players[key].pickingAt == id) {
                    rooms[socket.rooms[1]].players[socket.id].hasItem = false;
                    rooms[socket.rooms[1]].players[key].hasItem = true;
                    io.in(socket.rooms[1]).emit('itemLost', socket.id);
                    io.in(socket.rooms[1]).emit('itemPickUp', key);
                } else { rooms[socket.rooms[1]].players[socket.id].droppingAt = id; }
            });
        }
    });
    socket.on('itemPickChute', function(id) {
        if(rooms[socket.rooms[1]].players[socket.id].hasItem == false) {
            Object.keys(rooms[socket.rooms[1]].players).forEach(key => {
                if(rooms[socket.rooms[1]].players[key].droppingAt == id) {
                    rooms[socket.rooms[1]].players[key].droppingAt = null;
                    rooms[socket.rooms[1]].players[key].hasItem = false;
                    rooms[socket.rooms[1]].players[socket.id].hasItem = true;
                    io.in(socket.rooms[1]).emit('itemLost', key);
                    io.in(socket.rooms[1]).emit('itemPickUp', socket.id);
                } else { rooms[socket.rooms[1]].players[socket.id].pickingAt = id; }
            });
        }
    });
    socket.on('itemDropHeater', function() {
        if(rooms[socket.rooms[1]].players[socket.id].hasItem == true) {
            rooms[socket.rooms[1]].players[socket.id].hasItem = false;
            io.in(socket.rooms[1]).emit('tempIncrease');
            io.in(socket.rooms[1]).emit('itemLost', socket.id);
            Object.keys(rooms[socket.rooms[1]].players).forEach(key => {
                rooms[socket.rooms[1]].player[key].alive = true;
            });
        }
    });
    socket.on('updatePosition', function(data) {
        rooms[socket.rooms[1]].players[socket.id].pos.x = data.x;
        rooms[socket.rooms[1]].players[socket.id].pos.y = data.y;
        rooms[socket.rooms[1]].players[socket.id].pos.z = data.z;
        socket.emit('updatePosition', {playerId: socket.id, pos: rooms[socket.rooms[1]].players[socket.id].pos});
    });
    socket.on('tempNull', function() {
        rooms[socket.rooms[1]].players[socket.id].alive = false;
        var deadPlayers = 0;
        Object.keys(rooms[socket.rooms[1]].players).forEach(key => {
            if(rooms[socket.rooms[1]].player[key].alive == false) {
                deadPlayers++;
            }
        });
        if(deadPlayers >= 4) {
            rooms[socket.rooms[1]].alive = false;
            io.in(socket.rooms[1]).emit('gameOver', rank);
            rank--;
            io.emit('planetsLeft', rank);
        }
    });
});

var itemSpawn = 0;
var increaseDifficulty = 0;
eventEmitter.on('tick', function() {
    console.log("tick");
    itemSpawn++;
    increaseDifficulty++;
    if(itemSpawn > 5) {
        itemSpawn = 0;
        var itemId;
        Object.keys(rooms).forEach(key => {
            if(rooms[key].alive) {
                rooms[key].AddItem();
                itemId = rooms[key].curItemId;
            }
        });
        io.emit('itemSpawn', {id: itemId, position: randomInt(1, 9)});
    }
    if(increaseDifficulty > 20) {
        increaseDifficulty = 0;
        io.emit('increaseDifficulty');
    }
});

//server
console.log ('Server started.');
server.listen(3000);