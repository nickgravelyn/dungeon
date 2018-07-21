// array of all the levels in our game
var levels = [new Level()]

// the current level index into our levels array
var currentLevel = 0

// basic camera object
var camera = { x: 0, y: 0 }

// handle keyboard controls
var keysDown = { }
window.addEventListener(
  'keydown',
  function (e) {
    for (var k in Keys) {
      if (Keys[k] === e.keyCode) {
        keysDown[e.keyCode] = true
        if (e.preventDefault) { e.preventDefault() }
        return true
      }
    }
  },
  false)
window.addEventListener(
  'keyup',
  function (e) {
    for (var k in Keys) {
      if (Keys[k] === e.keyCode) {
        delete keysDown[e.keyCode]
        if (e.preventDefault) { e.preventDefault() }
        return true
      }
    }
  },
  false)

// the visibility type
var visibilityType = 'room'

// flag for taking screenshots
var takeScreenshot = false

// ensure we have requestAnimationFrame available for us
if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = (function () {
    return window.requestAnimationFrame ||
               window.webkitRequestAnimationFrame ||
               window.mozRequestAnimationFrame ||
               window.oRequestAnimationFrame ||
               window.msRequestAnimationFrame ||
               function (callback, element) { window.setTimeout(callback, 1000 / 60) }
  })()
}

function ResetGame () {
  levels = [new Level()]
  currentLevel = 0
  camera = { x: 0, y: 0 }
  keysDown = { }
}

function Screenshot () {
  takeScreenshot = true
}

function Update (elapsed) {
  // update the level
  var change = levels[currentLevel].update(elapsed, keysDown)

  // handle moving up and down floors
  if (change === -1) {
    if (currentLevel > 0) {
      currentLevel--
    }
  } else if (change === 1) {
    // make sure we create new levels as we go down if we're at the end of the array
    if (currentLevel === levels.length - 1) {
      levels.push(new Level())
    }

    currentLevel++
  }

  // compute the camera position using the player's center
  var canvas = document.getElementById('myCanvas')
  var player = levels[currentLevel].player
  var cx = player.pos.x + player.size.x / 2
  var cy = player.pos.y + player.size.y / 2
  camera.x = Math.floor(cx - canvas.width / 2)
  camera.y = Math.floor(cy - canvas.height / 2)
}

function Draw () {
  // get the canvas
  var canvas = document.getElementById('myCanvas')

  // grab the context and draw the background color
  var context = canvas.getContext('2d')
  context.fillStyle = 'black'
  context.fillRect(0, 0, canvas.width, canvas.height)

  // draw the current level
  levels[currentLevel].draw(canvas, context, camera, visibilityType)

  if (takeScreenshot) {
    // get the Data URL from the canvas and open it in a new window
    window.open(document.getElementById('myCanvas').toDataURL('image/png'))
    takeScreenshot = false
  }
}

var prevTime = Date.now()
function MainLoop () {
  // request an update for the next frame
  window.requestAnimationFrame(MainLoop, document.getElementById('myCanvas'))

  // compute our elapsed time
  var time = Date.now()
  var delta = (time - prevTime) / 1000.0
  prevTime = time

  // update the game
  Update(delta)

  // draw the game
  Draw()
}

function Initialize () {
  // hook the visibility chooser's event so we can update the level
  var visibility = document.getElementById('visibility')
  visibility.onchange = function () { visibilityType = visibility.options[visibility.selectedIndex].value }

  // start our loop
  window.requestAnimationFrame(MainLoop, document.getElementById('myCanvas'))
}
