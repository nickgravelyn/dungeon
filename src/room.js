import { Tiles } from './tiles'

export class Room {
  constructor (width, height) {
    this.size = { x: width, y: height }
    this.pos = { x: 0, y: 0 }
    this.tiles = []

    // surround the room with walls, and fill the rest with floors.
    for (var y = 0; y < this.size.y; y++) {
      var row = []
      for (var x = 0; x < this.size.x; x++) {
        if (y === 0 || y === this.size.y - 1 || x === 0 || x === this.size.x - 1) {
          row.push(Tiles.Wall)
        } else {
          row.push(Tiles.Floor)
        }
      }
      this.tiles.push(row)
    }
  }

  hasStairs () {
    // find out if we have any stair tiles in the room
    for (var y = 0; y < this.size.y; y++) {
      for (var x = 0; x < this.size.x; x++) {
        if (this.tiles[y][x] === Tiles.StairsDown || this.tiles[y][x] === Tiles.StairsUp) {
          return true
        }
      }
    }
    return false
  }

  getDoorLocations () {
    var doors = []

    // find all the doors and add their positions to the list
    for (var y = 0; y < this.size.y; y++) {
      for (var x = 0; x < this.size.x; x++) {
        if (this.tiles[y][x] === Tiles.Door) {
          doors.push({ x: x, y: y })
        }
      }
    }

    return doors
  }

  static areConnected (room1, room2) {
    // iterate the doors in room1 and see if any are also a door in room2
    var doors = room1.getDoorLocations()
    for (var i = 0; i < doors.length; i++) {
      var d = doors[i]

      // move the door into "world space" using room1's position
      d.x += room1.pos.x
      d.y += room1.pos.y

      // move the door into room2 space by subtracting room2's position
      d.x -= room2.pos.x
      d.y -= room2.pos.y

      // make sure the position is valid for room2's tiles array
      if (d.x < 0 || d.x > room2.size.x - 1 || d.y < 0 || d.y > room2.size.y - 1) { continue }

      // see if the tile is a door; if so this is a door from room1 to room2 so the rooms are connected
      if (room2.tiles[d.y][d.x] === Tiles.Door) {
        return true
      }
    }

    return false
  }
}
