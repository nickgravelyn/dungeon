function Dungeon (width, height) {
  this.size = { x: width, y: height }

  this.minRoomSize = 5
  this.maxRoomSize = 15
  this.maxNumRooms = 50
  this.maxRoomArea = 150

  this.addStairsUp = true
  this.addStairsDown = true

  this.rooms = []
  this.roomGrid = []

  this.getStairs = function () {
    var result = { up: null, down: null }
    for (var i = 0; i < this.rooms.length; i++) {
      var r = this.rooms[i]

      if (r.hasStairs()) {
        for (var y = 0; y < r.size.y; y++) {
          for (var x = 0; x < r.size.x; x++) {
            if (r.tiles[y][x] === Tiles.StairsUp) {
              result.up = { x: r.pos.x + x, y: r.pos.y + y }
            } else if (r.tiles[y][x] === Tiles.StairsUp) {
              result.down = { x: r.pos.x + x, y: r.pos.y + y }
            }
          }
        }
      }
    }
    return result
  }

  this.generate = function () {
    // clear
    this.rooms = []
    this.roomGrid = Array(this.size.y)
    for (var y = 0; y < this.size.y; y++) {
      var row = Array(this.size.x)
      for (var x = 0; x < this.size.x; x++) { row[x] = [] }
      this.roomGrid[y] = row
    }

    // seed the map with a starting randomly sized room in the center of the map
    var room = this.createRandomRoom()
    room.pos = {
      x: Math.floor(this.size.x / 2) - Math.floor(room.size.x / 2),
      y: Math.floor(this.size.y / 2) - Math.floor(room.size.y / 2),
    }
    this.addRoom(room)

    // continue generating rooms until we hit our cap or have hit our maximum iterations (generally
    // due to not being able to fit any more rooms in the map)
    var iter = this.maxNumRooms * 5
    while ((this.maxNumRooms <= 0 || this.rooms.length < this.maxNumRooms) && iter-- > 0) {
      this.generateRoom()
    }

    // now we want to randomly add doors between some of the rooms and other rooms they touch
    for (var i = 0; i < this.rooms.length; i++) {
      // find all rooms that we could connect with this one
      var targets = this.getPotentiallyTouchingRooms(this.rooms[i])
      for (var j = 0; j < targets.length; j++) {
        // make sure the rooms aren't already connected with a door
        if (!AreRoomsConnected(this.rooms[i], targets[j])) {
          // 20% chance we add a door connecting the rooms
          if (Math.random() < 0.2) {
            this.addDoor(this.findNewDoorLocation(this.rooms[i], targets[j]))
          }
        }
      }
    }

    // add stairs if desired
    if (this.addStairsDown) {
      this.addStairs(Tiles.StairsDown)
    }
    if (this.addStairsUp) {
      this.addStairs(Tiles.StairsUp)
    }
  }

  this.getFlattenedTiles = function () {
    // create the full map for the whole dungeon
    var tiles = Array(this.size.y)
    for (var y = 0; y < this.size.y; y++) {
      tiles[y] = Array(this.size.x)
      for (var x = 0; x < this.size.x; x++) { tiles[y][x] = null }
    }

    // fill in the map with details from each room
    for (var i = 0; i < this.rooms.length; i++) {
      var r = this.rooms[i]
      for (var y = 0; y < r.size.y; y++) {
        for (var x = 0; x < r.size.x; x++) {
          // no need to make objects for blank tiles
          if (r.tiles[y][x] !== 0) {
            // the tiles we give back are objects with some extra data
            tiles[y + r.pos.y][x + r.pos.x] = {
              type: r.tiles[y][x],
              hasBeenSeen: false,
            }
          }
        }
      }
    }

    // return the map to the caller
    return tiles
  }

  this.getCollisionMap = function () {
    // create the full collision map for the whole dungeon
    var collisionMap = Array(this.size.y)
    for (var y = 0; y < this.size.y; y++) {
      collisionMap[y] = Array(this.size.x)
      for (var x = 0; x < this.size.x; x++) { collisionMap[y][x] = 0 }
    }

    // fill in the collision map with details from each room
    for (var i = 0; i < this.rooms.length; i++) {
      var r = this.rooms[i]
      for (var y = 0; y < r.size.y; y++) {
        for (var x = 0; x < r.size.x; x++) {
          var value = 0
          switch (r.tiles[y][x]) {
            case Tiles.Wall:
              value = 1
              break
            case Tiles.StairsUp:
              value = 2
              break
            case Tiles.StairsDown:
              value = 3
              break
          }

          collisionMap[y + r.pos.y][x + r.pos.x] = value
        }
      }
    }

    // return the map to the caller
    return collisionMap
  }

  this.roomIntersect = function (room1, room2) {
    var x1 = room1.pos.x
    var y1 = room1.pos.y
    var w1 = room1.size.x
    var h1 = room1.size.y

    var x2 = room2.pos.x
    var y2 = room2.pos.y
    var w2 = room2.size.x
    var h2 = room2.size.y

    // the +1/-1 here are to allow the rooms one tile of overlap. this is to allow the rooms to share walls
    // instead of always ending up with two walls between the rooms
    if (x1 + w1 <= x2 + 1 || x1 >= x2 + w2 - 1 || y1 + h1 <= y2 + 1 || y1 >= y2 + h2 - 1) {
      return false
    }

    return true
  }

  this.canFitRoom = function (room) {
    // make sure the room fits inside the dungeon
    if (room.pos.x < 0 || room.pos.x + room.size.x > this.size.x - 1) { return false }
    if (room.pos.y < 0 || room.pos.y + room.size.y > this.size.y - 1) { return false }

    // make sure this room doesn't intersect any existing rooms
    for (var i = 0; i < this.rooms.length; i++) {
      var r = this.rooms[i]
      if (this.roomIntersect(room, r)) { return false }
    }

    return true
  }

  this.getPotentiallyTouchingRooms = function (room) {
    var touchingRooms = []

    // function that checks the list of rooms at a point in our grid for any potential touching rooms
    var checkRoomList = function (x, y, rg) {
      var r = rg[y][x]
      for (var i = 0; i < r.length; i++) {
        // make sure this room isn't the one we're searching around and that it isn't already in the list
        if (r[i] !== room && touchingRooms.indexOf(r[i]) < 0) {
          // make sure this isn't a corner of the room (doors can't go into corners)
          var lx = x - r[i].pos.x
          var ly = y - r[i].pos.y
          if ((lx > 0 && lx < r[i].size.x - 1) || (ly > 0 && ly < r[i].size.y - 1)) {
            touchingRooms.push(r[i])
          }
        }
      }
    }

    // iterate the north and south walls, looking for other rooms in those tile locations
    for (var x = room.pos.x + 1; x < room.pos.x + room.size.x - 1; x++) {
      checkRoomList(x, room.pos.y, this.roomGrid)
      checkRoomList(x, room.pos.y + room.size.y - 1, this.roomGrid)
    }

    // iterate the west and east walls, looking for other rooms in those tile locations
    for (var y = room.pos.y + 1; y < room.pos.y + room.size.y - 1; y++) {
      checkRoomList(room.pos.x, y, this.roomGrid)
      checkRoomList(room.pos.x + room.size.x - 1, y, this.roomGrid)
    }

    return touchingRooms
  }

  this.findNewDoorLocation = function (room1, room2) {
    var doorPos = { x: -1, y: -1 }

    // figure out the direction from room1 to room2
    var dir = -1

    if (room1.pos.y === room2.pos.y - room1.size.y + 1) {
      dir = 0
    } else if (room1.pos.x === room2.pos.x - room1.size.x + 1) {
      dir = 1
    } else if (room1.pos.x === room2.pos.x + room2.size.x - 1) {
      dir = 2
    } else if (room1.pos.y === room2.pos.y + room2.size.y - 1) {
      dir = 3
    }

    // use the direction to find an appropriate door location
    switch (dir) {
      // north
      case 0:
        doorPos.x = Math.rand(
          Math.floor(Math.max(room2.pos.x, room1.pos.x) + 1),
          Math.floor(Math.min(room2.pos.x + room2.size.x, room1.pos.x + room1.size.x) - 1))
        doorPos.y = room2.pos.y
        break
      // west
      case 1:
        doorPos.x = room2.pos.x
        doorPos.y = Math.rand(
          Math.floor(Math.max(room2.pos.y, room1.pos.y) + 1),
          Math.floor(Math.min(room2.pos.y + room2.size.y, room1.pos.y + room1.size.y) - 1))
        break
      // east
      case 2:
        doorPos.x = room1.pos.x
        doorPos.y = Math.rand(
          Math.floor(Math.max(room2.pos.y, room1.pos.y) + 1),
          Math.floor(Math.min(room2.pos.y + room2.size.y, room1.pos.y + room1.size.y) - 1))
        break
      // south
      case 3:
        doorPos.x = Math.rand(
          Math.floor(Math.max(room2.pos.x, room1.pos.x) + 1),
          Math.floor(Math.min(room2.pos.x + room2.size.x, room1.pos.x + room1.size.x) - 1))
        doorPos.y = room1.pos.y
        break
    }

    return doorPos
  }

  this.findRoomAttachment = function (room) {
    // pick a room, any room
    var r = this.rooms.random()

    var pos = { x: 0, y: 0 }

    // randomly position this room on one of the sides of the random room
    switch (Math.rand(0, 4)) {
      // north
      case 0:
        pos.x = Math.rand(r.pos.x - room.size.x + 3, r.pos.x + r.size.x - 2)
        pos.y = r.pos.y - room.size.y + 1
        break
        // west
      case 1:
        pos.x = r.pos.x - room.size.x + 1
        pos.y = Math.rand(r.pos.y - room.size.y + 3, r.pos.y + r.size.y - 2)
        break
        // east
      case 2:
        pos.x = r.pos.x + r.size.x - 1
        pos.y = Math.rand(r.pos.y - room.size.y + 3, r.pos.y + r.size.y - 2)
        break
        // south
      case 3:
        pos.x = Math.rand(r.pos.x - room.size.x + 3, r.pos.x + r.size.x - 2)
        pos.y = r.pos.y + r.size.y - 1
        break
    }

    // return the position for this new room and the target room
    return {
      position: pos,
      target: r,
    }
  }

  this.addRoom = function (room) {
    // if the room won't fit, we don't add it
    if (!this.canFitRoom(room)) { return false }

    // add it to our main rooms list
    this.rooms.push(room)

    // update all tiles to indicate that this room is sitting on them. this grid is used
    // when placing doors so all rooms in a space can be updated at the same time.
    for (var y = room.pos.y; y < room.pos.y + room.size.y; y++) {
      for (var x = room.pos.x; x < room.pos.x + room.size.x; x++) {
        var list = this.roomGrid[y][x]
        list.push(room)
        this.roomGrid[y][x] = list
      }
    }

    return true
  }

  this.addDoor = function (doorPos) {
    // get all the rooms at the location of the door
    var rooms = this.roomGrid[doorPos.y][doorPos.x]
    for (var i = 0; i < rooms.length; i++) {
      var r = rooms[i]

      // convert the door position from world space to room space
      var x = doorPos.x - r.pos.x
      var y = doorPos.y - r.pos.y

      // set the tile to be a door
      r.tiles[y][x] = Tiles.Door
    }
  }

  this.createRandomRoom = function () {
    var width = 0
    var height = 0
    var area = 0

    // find an acceptable width and height using our min/max sizes while keeping under
    // the maximum area
    do {
      width = Math.rand(this.minRoomSize, this.maxRoomSize)
      height = Math.rand(this.minRoomSize, this.maxRoomSize)
      area = width * height
    } while (this.maxRoomArea > 0 && area > this.maxRoomArea)

    // create the room
    return new Room(width, height)
  }

  this.generateRoom = function () {
    // create the randomly sized room
    var room = this.createRandomRoom()

    // only allow 150 tries at placing the room
    var iter = 150
    while (iter-- > 0) {
      // attempt to find another room to attach this one to
      var result = this.findRoomAttachment(room)

      // update the position of this room
      room.pos = result.position

      // try to add it. if successful, add the door between the rooms and break the loop
      if (this.addRoom(room)) {
        this.addDoor(this.findNewDoorLocation(room, result.target))
        break
      }
    }
  }

  this.addStairs = function (type) {
    var room = null

    // keep picking random rooms until we find one that has only one door and doesn't already have stairs in it
    do { room = this.rooms.random() }
    while (room.getDoorLocations().length > 1 || room.hasStairs())

    // build a list of all locations in the room that qualify for stairs
    var candidates = []
    for (var y = 1; y < room.size.y - 2; y++) {
      for (var x = 1; x < room.size.x - 2; x++) {
        // only put stairs on the floor
        if (room.tiles[y][x] !== Tiles.Floor) { continue }

        // make sure this floor isn't right next to a door
        if (room.tiles[y - 1][x] === Tiles.Door ||
                    room.tiles[y + 1][x] === Tiles.Door ||
                    room.tiles[y][x - 1] === Tiles.Door ||
                    room.tiles[y][x + 1] === Tiles.Door) { continue }

        // add it to the candidate list
        candidates.push({ x: x, y: y })
      }
    }

    // pick a random candidate location and make it the stairs
    var loc = candidates.random()
    room.tiles[loc.y][loc.x] = type
  }
}
