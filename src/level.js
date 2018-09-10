import { Dungeon } from "./dungeon";
import { keys } from "./keys";
import { tiles } from "./tiles";

const { floor, abs } = Math;

const tileSize = 16;

export class Level {
  constructor() {
    // create a dungeon
    this.dungeon = new Dungeon(100, 100);
    this.dungeon.generate();

    // the current collision map for the dungeon
    this.collisionMap = this.dungeon.getCollisionMap();

    // the tiles in the map
    this.tiles = this.dungeon.getFlattenedTiles();

    // basic player object
    this.player = {
      pos: { x: 0, y: 0 },
      size: { x: 12, y: 12 },
      speed: 175,
      color: "#0CED13",
      onStairs: true,
    };

    // place the player at the up stair case
    let stairs = this.dungeon.getStairs();
    this.player.pos.x =
      stairs.up.x * tileSize + tileSize / 2 - this.player.size.x / 2;
    this.player.pos.y =
      stairs.up.y * tileSize + tileSize / 2 - this.player.size.y / 2;
  }

  width() {
    return this.dungeon.size.x * tileSize;
  }

  height() {
    return this.dungeon.size.y * tileSize;
  }

  update(elapsed, keysDown) {
    // handle input to move the player
    let move = { x: 0, y: 0 };
    if (keys.left in keysDown) {
      move.x -= this.player.speed * elapsed;
    }
    if (keys.right in keysDown) {
      move.x += this.player.speed * elapsed;
    }
    if (keys.up in keysDown) {
      move.y -= this.player.speed * elapsed;
    }
    if (keys.down in keysDown) {
      move.y += this.player.speed * elapsed;
    }

    // collide the player against the dungeon
    this.player.pos = this.moveEntity(this.player.pos, this.player.size, move);

    // compute the player's center
    let cx = floor((this.player.pos.x + this.player.size.x / 2) / tileSize);
    let cy = floor((this.player.pos.y + this.player.size.y / 2) / tileSize);

    // the return value for the destination. -1 means go up a floor, 1 means go down a floor
    let dest = 0;

    // tracks if the player is on stairs this frame
    let onStairs = false;

    // grab the new current list of rooms
    let rooms = this.dungeon.roomGrid[cy][cx];
    for (let i = 0; i < rooms.length; i++) {
      let r = rooms[i];

      // get the player's center in room coordinates
      let lx = cx - r.pos.x;
      let ly = cy - r.pos.y;

      // if we're on the up stairs, return -1 to indicate we want to move up
      if (r.tiles[ly][lx] === tiles.stairsUp) {
        onStairs = true;

        if (!this.player.onStairs) {
          dest = -1;
          break;
        }
      }

      // if we're on the down stairs, return 1 to indicate we want to move down
      if (r.tiles[ly][lx] === tiles.stairsDown) {
        onStairs = true;

        if (!this.player.onStairs) {
          dest = 1;
          break;
        }
      }
    }

    // update the player's "onStairs" property
    this.player.onStairs = onStairs;

    // return our destination
    return dest;
  }

  // x0/y0 === the player
  // x1/y1 === the tile
  isTileVisible(visibility, x0, y0, x1, y1) {
    // all tiles are visible if we're not doing visibility checks
    if (visibility === "none") {
      return true;
    }

    // for room mode, just check that we're in the same room as the tile
    if (visibility === "room") {
      let rooms = this.dungeon.roomGrid[y0][x0];
      if (rooms !== null) {
        for (let i = 0; i < rooms.length; i++) {
          let r = rooms[i];
          if (
            x1 >= r.pos.x &&
            x1 < r.pos.x + r.size.x &&
            y1 >= r.pos.y &&
            y1 < r.pos.y + r.size.y
          ) {
            return true;
          }
        }
      }
    }

    // if we're using los visibility, we want to do a basic line of sight algorithm
    if (visibility === "los") {
      // if one or both points are outside of this map, we discount it from the checks
      if (
        x0 < 0 ||
        x0 >= this.dungeon.size.x ||
        x1 < 0 ||
        x1 >= this.dungeon.size.x ||
        y0 < 0 ||
        y0 >= this.dungeon.size.y ||
        y1 < 0 ||
        y1 >= this.dungeon.size.y
      ) {
        return true;
      }

      // get the deltas and steps for both axis
      let dx = abs(x1 - x0);
      let dy = abs(y1 - y0);
      let sx = x0 < x1 ? 1 : -1;
      let sy = y0 < y1 ? 1 : -1;

      // stores an error factor we use to change the axis coordinates
      let err = dx - dy;

      while (x0 !== x1 || y0 !== y1) {
        // check our collision map to see if this tile blocks visibility
        if (this.collisionMap[y0][x0] === 1) {
          return false;
        }

        // check our error value against our deltas to see if
        // we need to move to a new point on either axis
        let e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          x0 += sx;
        }
        if (e2 < dx) {
          err += dx;
          y0 += sy;
        }
      }

      // if we're here we hit no occluders and therefore can see this tile
      return true;
    }

    // if nothing else hit, then this tile isn't visible
    return false;
  }

  draw(canvas, context, camera, visibility) {
    // compute the player's center in tile space for the tile visibility checks
    let cx = floor((this.player.pos.x + this.player.size.x / 2) / tileSize);
    let cy = floor((this.player.pos.y + this.player.size.y / 2) / tileSize);

    // calculate the base tile coordinates using the camera
    let baseTileX = floor(camera.x / tileSize) - 1;
    let baseTileY = floor(camera.y / tileSize) - 1;

    // calculating the pixel offset based on the camera
    // following http://javascript.about.com/od/problemsolving/a/modulobug.htm to fix negative camera values
    let pixelOffsetX = ((camera.x % tileSize) + tileSize) % tileSize;
    let pixelOffsetY = ((camera.y % tileSize) + tileSize) % tileSize;

    // calculate the min and max X/Y values
    let pixelMinX = -pixelOffsetX - tileSize;
    let pixelMinY = -pixelOffsetY - tileSize;
    let pixelMaxX = canvas.width + tileSize - pixelOffsetX;
    let pixelMaxY = canvas.height + tileSize - pixelOffsetY;

    // loop over each row, using both tile coordinates and pixel coordinates
    for (
      let tileY = baseTileY, y = pixelMinY;
      y < pixelMaxY;
      tileY++, y += tileSize
    ) {
      // verify this row is actually inside the dungeon
      if (tileY < 0 || tileY >= this.dungeon.size.y) {
        continue;
      }

      // loop over each column, using both tile coordinates and pixel coordinates
      for (
        let tileX = baseTileX, x = pixelMinX;
        x < pixelMaxX;
        tileX++, x += tileSize
      ) {
        // verify this column is actually inside the dungeon
        if (tileX < 0 || tileX >= this.dungeon.size.x) {
          continue;
        }

        // get the current tile and make sure it's valid
        let tile = this.tiles[tileY][tileX];
        if (tile !== null) {
          // test if the tile is visible
          let canBeSeen = this.isTileVisible(visibility, cx, cy, tileX, tileY);

          // make sure the tile stores a record if it's ever been seen
          if (canBeSeen) {
            tile.HasBeenSeen = true;
          }

          // if we have ever seen this tile, we need to draw it
          if (tile.HasBeenSeen) {
            // choose the color by the type and whether the tile is currently visible
            switch (tile.type) {
              case tiles.floor:
              case tiles.door:
                context.fillStyle = canBeSeen ? "#B8860B" : "#705104";
                break;
              case tiles.wall:
                context.fillStyle = canBeSeen ? "#8B4513" : "#61300D";
                break;
              case tiles.stairsDown:
                context.fillStyle = "#7A5A0D";
                break;
              case tiles.stairsUp:
                context.fillStyle = "#F2CD27";
                break;
            }

            // draw the tile
            context.fillRect(x, y, tileSize, tileSize);
          }
        }
      }
    }

    // draw the player
    context.fillStyle = this.player.color;
    context.fillRect(
      floor(this.player.pos.x - camera.x),
      floor(this.player.pos.y - camera.y),
      floor(this.player.size.x),
      floor(this.player.size.y)
    );
  }

  moveEntity(pos, size, move) {
    // start with the end goal position
    let endPos = {
      x: pos.x + move.x,
      y: pos.y + move.y,
    };

    // check X axis motion for collisions
    if (move.x) {
      // calculate the X tile coordinate where we'd like to be
      let offset = move.x > 0 ? size.x : 0;
      let x = floor((pos.x + move.x + offset) / tileSize);

      // figure out the range of Y tile coordinates that we can collide with
      let start = floor(pos.y / tileSize);
      let end = Math.ceil((pos.y + size.y) / tileSize);

      // determine whether these tiles are all inside the map
      if (
        end >= 0 &&
        start < this.dungeon.size.y &&
        x >= 0 &&
        x < this.dungeon.size.x
      ) {
        // go down each of the tiles along the Y axis
        for (let y = start; y < end; y++) {
          // if there is a wall in the tile
          if (this.collisionMap[y][x] === tiles.wall) {
            // we adjust our end position accordingly
            endPos.x = x * tileSize - offset + (move.x < 0 ? tileSize : 0);
            break;
          }
        }
      }
    }

    // then check Y axis motion for collisions
    if (move.y) {
      // calculate the X tile coordinate where we'd like to be
      let offset = move.y > 0 ? size.y : 0;
      let y = floor((pos.y + move.y + offset) / tileSize);

      // figure out the range of X tile coordinates that we can collide with
      let start = floor(endPos.x / tileSize);
      let end = Math.ceil((endPos.x + size.x) / tileSize);

      // determine whether these tiles are all inside the map
      if (
        end >= 0 &&
        start < this.dungeon.size.x &&
        y >= 0 &&
        y < this.dungeon.size.y
      ) {
        // go across each of the tiles along the X axis
        for (let x = start; x < end; x++) {
          // if there is a wall in the tile
          if (this.collisionMap[y][x] === tiles.wall) {
            // we adjust our end position accordingly
            endPos.y = y * tileSize - offset + (move.y < 0 ? tileSize : 0);
            break;
          }
        }
      }
    }

    // give back the new position for the object
    return endPos;
  }
}
