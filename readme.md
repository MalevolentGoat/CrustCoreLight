setup in config.js

start:
node ccl.js

API:
Server:
('isAdmin')                     skips usual routine and sends client to admin page
('start')                       starts the game
('reset')                       resets rooms
('createRoom', name)            initializes a room with team'name'
('initialize', {name, code})    initializes player object in correct team via 'code' and sends back it's position# (1-4)
                                and an arrayObject with other players
('itemPickUp', id)
('itemDropChute', id)           id of chute
('itemPickChute', id)           id of chute
('itemDropHeater')
('updatePosition', pos)         format: pos.x, pos.y, pos.z
('tempNull')

Client:
('promote')                     promotes client to admin
('denied', msg)                 tells client denied and 'msg'
('rooms', rooms)                sends rooms object to client. !only to admins plx! contains rooms.name and rooms.code
('room', {name, position, otherPlayers})
                                tells player the team'name' and it's 'position'
('gameStart')                   tells players the game starts now
('tempIncrease')
('itemSpawn', {id, position})       format: # between 1-8
('itemDelete', id)
('itemPickUp', playerId)
('itemLost', playerId)
('updatePosition',  {playerId, pos})         format: pos.x, pos.y, pos.z
('increaseDifficulty')
('gameOver', rank)                    


TODODODO: cleanup on reset