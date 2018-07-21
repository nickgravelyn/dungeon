import { Level } from './level'
import { Keys } from './keys'

// array of all the levels in our game
let levels = [new Level()]

// the current level index into our levels array
let currentLevel = 0

// basic camera object
let camera = { x: 0, y: 0 }

// handle keyboard controls
let keysDown = { }
window.addEventListener(
  'keydown',
  function (e) {
    for (let k in Keys) {
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
    for (let k in Keys) {
      if (Keys[k] === e.keyCode) {
        delete keysDown[e.keyCode]
        if (e.preventDefault) { e.preventDefault() }
        return true
      }
    }
  },
  false)

// the visibility type
let visibilityType = 'room'

// flag for taking screenshots
let takeScreenshot = false

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

document.getElementById('resetBtn').addEventListener('click', () => {
  levels = [new Level()]
  currentLevel = 0
  camera = { x: 0, y: 0 }
  keysDown = { }
})

document.getElementById('screenshotBtn').addEventListener('click', () => {
  takeScreenshot = true
})

function update (elapsed) {
  // update the level
  let change = levels[currentLevel].update(elapsed, keysDown)

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
  let canvas = document.getElementById('myCanvas')
  let player = levels[currentLevel].player
  let cx = player.pos.x + player.size.x / 2
  let cy = player.pos.y + player.size.y / 2
  camera.x = Math.floor(cx - canvas.width / 2)
  camera.y = Math.floor(cy - canvas.height / 2)
}

function draw () {
  // get the canvas
  let canvas = document.getElementById('myCanvas')

  // grab the context and draw the background color
  let context = canvas.getContext('2d')
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

let prevTime = Date.now()
function tick () {
  // request an update for the next frame
  window.requestAnimationFrame(tick)

  // compute our elapsed time
  let time = Date.now()
  let delta = (time - prevTime) / 1000.0
  prevTime = time

  // update the game
  update(delta)

  // draw the game
  draw()
}

// hook the visibility chooser's event so we can update the level
let visibility = document.getElementById('visibility')
visibility.onchange = () => {
  visibilityType = visibility.options[visibility.selectedIndex].value
}

// start our loop
window.requestAnimationFrame(tick)
