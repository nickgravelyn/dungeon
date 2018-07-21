import { Level } from './level'
import { keys } from './keys'

const keysDown = { }
window.addEventListener(
  'keydown',
  function (e) {
    for (const k in keys) {
      if (keys[k] === e.keyCode) {
        keysDown[e.keyCode] = true
        if (e.preventDefault) {
          e.preventDefault()
        }
        return true
      }
    }
  },
  false)
window.addEventListener(
  'keyup',
  function (e) {
    for (const k in keys) {
      if (keys[k] === e.keyCode) {
        delete keysDown[e.keyCode]
        if (e.preventDefault) {
          e.preventDefault()
        }
        return true
      }
    }
  },
  false)

let levels = [new Level()]
let currentLevel = 0
let camera = { x: 0, y: 0 }
let visibilityType = 'room'
let takeScreenshot = false

document.getElementById('resetBtn').addEventListener('click', () => {
  levels = [new Level()]
  currentLevel = 0
  camera = { x: 0, y: 0 }
})

document.getElementById('screenshotBtn').addEventListener('click', () => {
  takeScreenshot = true
})

function update (elapsed) {
  const change = levels[currentLevel].update(elapsed, keysDown)

  if (change === -1) {
    if (currentLevel > 0) {
      currentLevel--
    }
  } else if (change === 1) {
    if (currentLevel === levels.length - 1) {
      levels.push(new Level())
    }

    currentLevel++
  }

  const canvas = document.getElementById('myCanvas')
  const player = levels[currentLevel].player
  const cx = player.pos.x + player.size.x / 2
  const cy = player.pos.y + player.size.y / 2
  camera.x = Math.floor(cx - canvas.width / 2)
  camera.y = Math.floor(cy - canvas.height / 2)
}

function draw () {
  const canvas = document.getElementById('myCanvas')

  const context = canvas.getContext('2d')
  context.fillStyle = 'black'
  context.fillRect(0, 0, canvas.width, canvas.height)

  levels[currentLevel].draw(canvas, context, camera, visibilityType)

  if (takeScreenshot) {
    window.open(document.getElementById('myCanvas').toDataURL('image/png'))
    takeScreenshot = false
  }
}

let prevTime = Date.now()
function tick () {
  window.requestAnimationFrame(tick)

  const time = Date.now()
  const delta = (time - prevTime) / 1000.0
  prevTime = time

  update(delta)
  draw()
}

const visibilitySelector = document.getElementById('visibility')
visibilitySelector.onchange = () => {
  visibilityType = visibilitySelector.options[visibilitySelector.selectedIndex].value
}

window.requestAnimationFrame(tick)
