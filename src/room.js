import tiles from "./tiles";

export default class Room {
  constructor(width, height) {
    this.size = { x: width, y: height };
    this.pos = { x: 0, y: 0 };
    this.tiles = [];

    // surround the room with walls, and fill the rest with floors.
    for (let y = 0; y < this.size.y; y++) {
      let row = [];
      for (let x = 0; x < this.size.x; x++) {
        if (
          y === 0 ||
          y === this.size.y - 1 ||
          x === 0 ||
          x === this.size.x - 1
        ) {
          row.push(tiles.wall);
        } else {
          row.push(tiles.floor);
        }
      }
      this.tiles.push(row);
    }
  }

  hasStairs() {
    // find out if we have any stair tiles in the room
    for (let y = 0; y < this.size.y; y++) {
      for (let x = 0; x < this.size.x; x++) {
        if (
          this.tiles[y][x] === tiles.stairsDown ||
          this.tiles[y][x] === tiles.stairsUp
        ) {
          return true;
        }
      }
    }
    return false;
  }

  getDoorLocations() {
    let doors = [];

    // find all the doors and add their positions to the list
    for (let y = 0; y < this.size.y; y++) {
      for (let x = 0; x < this.size.x; x++) {
        if (this.tiles[y][x] === tiles.door) {
          doors.push({ x: x, y: y });
        }
      }
    }

    return doors;
  }

  static areConnected(room1, room2) {
    // iterate the doors in room1 and see if any are also a door in room2
    let doors = room1.getDoorLocations();
    for (let i = 0; i < doors.length; i++) {
      let d = doors[i];

      // move the door into "world space" using room1's position
      d.x += room1.pos.x;
      d.y += room1.pos.y;

      // move the door into room2 space by subtracting room2's position
      d.x -= room2.pos.x;
      d.y -= room2.pos.y;

      // make sure the position is valid for room2's tiles array
      if (
        d.x < 0 ||
        d.x > room2.size.x - 1 ||
        d.y < 0 ||
        d.y > room2.size.y - 1
      ) {
        continue;
      }

      // see if the tile is a door; if so this is a door from room1 to room2 so the rooms are connected
      if (room2.tiles[d.y][d.x] === tiles.door) {
        return true;
      }
    }

    return false;
  }
}
