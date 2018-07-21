var tileSize = 16

function Level () {
  // create a dungeon
  this.dungeon = new Dungeon(100, 100)
  this.dungeon.generate()

  // the current collision map for the dungeon
  this.collisionMap = this.dungeon.getCollisionMap()

  // the tiles in the map
  this.tiles = this.dungeon.getFlattenedTiles()

  // basic player object
  this.player = {
    pos: { x: 0, y: 0 },
    size: { x: 12, y: 12 },
    speed: 175,
    color: '#0CED13',
    onStairs: true,
  }

  // place the player at the up stair case
  var stairs = this.dungeon.getStairs()
  this.player.pos.x = (stairs.up.x * tileSize) + tileSize / 2 - this.player.size.x / 2
  this.player.pos.y = (stairs.up.y * tileSize) + tileSize / 2 - this.player.size.y / 2

  this.width = function () { return this.dungeon.size.x * tileSize }
  this.height = function () { return this.dungeon.size.y * tileSize }

  this.update = function (elapsed, keysDown) {
    // handle input to move the player
    var move = { x: 0, y: 0 }
    if (Keys.Left in keysDown) {
      move.x -= this.player.speed * elapsed
    }
    if (Keys.Right in keysDown) {
      move.x += this.player.speed * elapsed
    }
    if (Keys.Up in keysDown) {
      move.y -= this.player.speed * elapsed
    }
    if (Keys.Down in keysDown) {
      move.y += this.player.speed * elapsed
    }

    // collide the player against the dungeon
    this.player.pos = this.moveEntity(this.player.pos, this.player.size, move)

    // compute the player's center
    var cx = Math.floor((this.player.pos.x + this.player.size.x / 2) / tileSize)
    var cy = Math.floor((this.player.pos.y + this.player.size.y / 2) / tileSize)

    // the return value for the destination. -1 means go up a floor, 1 means go down a floor
    var dest = 0

    // tracks if the player is on stairs this frame
    var onStairs = false

    // grab the new current list of rooms
    var rooms = this.dungeon.roomGrid[cy][cx]
    for (var i = 0; i < rooms.length; i++) {
      var r = rooms[i]

      // get the player's center in room coordinates
      var lx = cx - r.pos.x
      var ly = cy - r.pos.y

      // if we're on the up stairs, return -1 to indicate we want to move up
      if (r.tiles[ly][lx] === Tiles.StairsUp) {
        onStairs = true

        if (!this.player.onStairs) {
          dest = -1
          break
        }
      }

      // if we're on the down stairs, return 1 to indicate we want to move down
      if (r.tiles[ly][lx] === Tiles.StairsDown) {
        onStairs = true

        if (!this.player.onStairs) {
          dest = 1
          break
        }
      }
    }

    // update the player's "onStairs" property
    this.player.onStairs = onStairs

    // return our destination
    return dest
  }

  // x0/y0 === the player
  // x1/y1 === the tile
  this.isTileVisible = function (visibility, x0, y0, x1, y1) {
    // all tiles are visible if we're not doing visibility checks
    if (visibility === 'none') { return true }

    // for room mode, just check that we're in the same room as the tile
    if (visibility === 'room') {
      var rooms = this.dungeon.roomGrid[y0][x0]
      if (rooms !== null) {
        for (var i = 0; i < rooms.length; i++) {
          var r = rooms[i]
          if (x1 >= r.pos.x && x1 < r.pos.x + r.size.x && y1 >= r.pos.y && y1 < r.pos.y + r.size.y) {
            return true
          }
        }
      }
    }

    // if we're using los visibility, we want to do a basic line of sight algorithm
    if (visibility === 'los') {
      // if one or both points are outside of this map, we discount it from the checks
      if (x0 < 0 || x0 >= this.dungeon.size.x || x1 < 0 || x1 >= this.dungeon.size.x ||
                y0 < 0 || y0 >= this.dungeon.size.y || y1 < 0 || y1 >= this.dungeon.size.y) {
        return true
      }

      // get the deltas and steps for both axis
      var dx = Math.abs(x1 - x0)
      var dy = Math.abs(y1 - y0)
      var sx = x0 < x1 ? 1 : -1
      var sy = y0 < y1 ? 1 : -1

      // stores an error factor we use to change the axis coordinates
      var err = dx - dy

      while (x0 !== x1 || y0 !== y1) {
        // check our collision map to see if this tile blocks visibility
        if (this.collisionMap[y0][x0] === 1) { return false }

        // check our error value against our deltas to see if
        // we need to move to a new point on either axis
        var e2 = 2 * err
        if (e2 > -dy) {
          err -= dy
          x0 += sx
        }
        if (e2 < dx) {
          err += dx
          y0 += sy
        }
      }

      // if we're here we hit no occluders and therefore can see this tile
      return true
    }

    // if nothing else hit, then this tile isn't visible
    return false
  }

  this.draw = function (canvas, context, camera, visibility) {
    // compute the player's center in tile space for the tile visibility checks
    var cx = Math.floor((this.player.pos.x + this.player.size.x / 2) / tileSize)
    var cy = Math.floor((this.player.pos.y + this.player.size.y / 2) / tileSize)

    // calculate the base tile coordinates using the camera
    var baseTileX = Math.floor(camera.x / tileSize) - 1
    var baseTileY = Math.floor(camera.y / tileSize) - 1

    // calculating the pixel offset based on the camera
    // following http://javascript.about.com/od/problemsolving/a/modulobug.htm to fix negative camera values
    var pixelOffsetX = ((camera.x % tileSize) + tileSize) % tileSize
    var pixelOffsetY = ((camera.y % tileSize) + tileSize) % tileSize

    // calculate the min and max X/Y values
    var pixelMinX = -pixelOffsetX - tileSize
    var pixelMinY = -pixelOffsetY - tileSize
    var pixelMaxX = canvas.width + tileSize - pixelOffsetX
    var pixelMaxY = canvas.height + tileSize - pixelOffsetY

    // loop over each row, using both tile coordinates and pixel coordinates
    for (var tileY = baseTileY, y = pixelMinY; y < pixelMaxY; tileY++, y += tileSize) {
      // verify this row is actually inside the dungeon
      if (tileY < 0 || tileY >= this.dungeon.size.y) { continue }

      // loop over each column, using both tile coordinates and pixel coordinates
      for (var tileX = baseTileX, x = pixelMinX; x < pixelMaxX; tileX++, x += tileSize) {
        // verify this column is actually inside the dungeon
        if (tileX < 0 || tileX >= this.dungeon.size.x) { continue }

        // get the current tile and make sure it's valid
        var tile = this.tiles[tileY][tileX]
        if (tile !== null) {
          // test if the tile is visible
          var canBeSeen = this.isTileVisible(visibility, cx, cy, tileX, tileY)

          // make sure the tile stores a record if it's ever been seen
          if (canBeSeen) { tile.HasBeenSeen = true }

          // if we have ever seen this tile, we need to draw it
          if (tile.HasBeenSeen) {
            // choose the color by the type and whether the tile is currently visible
            switch (tile.type) {
              case Tiles.Floor:
              case Tiles.Door:
                context.fillStyle = canBeSeen ? '#B8860B' : '#705104'
                break
              case Tiles.Wall:
                context.fillStyle = canBeSeen ? '#8B4513' : '#61300D'
                break
              case Tiles.StairsDown:
                context.fillStyle = '#7A5A0D'
                break
              case Tiles.StairsUp:
                context.fillStyle = '#F2CD27'
                break
            }

            // draw the tile
            context.fillRect(x, y, tileSize, tileSize)
          }
        }
      }
    }

    // draw the player
    context.fillStyle = this.player.color
    context.fillRect(
      Math.floor(this.player.pos.x - camera.x),
      Math.floor(this.player.pos.y - camera.y),
      Math.floor(this.player.size.x),
      Math.floor(this.player.size.y))
  }

  this.moveEntity = function (pos, size, move) {
    // start with the end goal position
    var endPos = {
      x: pos.x + move.x,
      y: pos.y + move.y,
    }

    // check X axis motion for collisions
    if (move.x) {
      // calculate the X tile coordinate where we'd like to be
      var offset = (move.x > 0 ? size.x : 0)
      var x = Math.floor((pos.x + move.x + offset) / tileSize)

      // figure out the range of Y tile coordinates that we can collide with
      var start = Math.floor(pos.y / tileSize)
      var end = Math.ceil((pos.y + size.y) / tileSize)

      // determine whether these tiles are all inside the map
      if (end >= 0 && start < this.dungeon.size.y && x >= 0 && x < this.dungeon.size.x) {
        // go down each of the tiles along the Y axis
        for (var y = start; y < end; y++) {
          // if there is a wall in the tile
          if (this.collisionMap[y][x] === Tiles.Wall) {
            // we adjust our end position accordingly
            endPos.x = x * tileSize - offset + (move.x < 0 ? tileSize : 0)
            break
          }
        }
      }
    }

    // then check Y axis motion for collisions
    if (move.y) {
      // calculate the X tile coordinate where we'd like to be
      var offset = (move.y > 0 ? size.y : 0)
      var y = Math.floor((pos.y + move.y + offset) / tileSize)

      // figure out the range of X tile coordinates that we can collide with
      var start = Math.floor(endPos.x / tileSize)
      var end = Math.ceil((endPos.x + size.x) / tileSize)

      // determine whether these tiles are all inside the map
      if (end >= 0 && start < this.dungeon.size.x && y >= 0 && y < this.dungeon.size.y) {
        // go across each of the tiles along the X axis
        for (var x = start; x < end; x++) {
          // if there is a wall in the tile
          if (this.collisionMap[y][x] === Tiles.Wall) {
            // we adjust our end position accordingly
            endPos.y = y * tileSize - offset + (move.y < 0 ? tileSize : 0)
            break
          }
        }
      }
    }

    // give back the new position for the object
    return endPos
  }
}
