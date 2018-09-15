import Level from "./level";
import keys from "./keys";

const { floor } = Math;

const keysDown = {};
window.addEventListener(
  "keydown",
  function(e) {
    for (const k in keys) {
      if (keys[k] === e.keyCode) {
        keysDown[e.keyCode] = true;
        if (e.preventDefault) {
          e.preventDefault();
        }
        return true;
      }
    }
  },
  false
);
window.addEventListener(
  "keyup",
  function(e) {
    for (const k in keys) {
      if (keys[k] === e.keyCode) {
        delete keysDown[e.keyCode];
        if (e.preventDefault) {
          e.preventDefault();
        }
        return true;
      }
    }
  },
  false
);

let levels = [new Level()];
let currentLevel = 0;
let visibilityType = "room";
let takeScreenshot = false;

document.getElementById("resetBtn").addEventListener("click", () => {
  levels = [new Level()];
  currentLevel = 0;
});

document.getElementById("screenshotBtn").addEventListener("click", () => {
  takeScreenshot = true;
});

const visibilitySelector = document.getElementById("visibility");
visibilitySelector.onchange = () => {
  visibilityType =
    visibilitySelector.options[visibilitySelector.selectedIndex].value;
};

let prevTime;
function tick(timestamp) {
  window.requestAnimationFrame(tick);

  if (!prevTime) {
    prevTime = timestamp;
  }
  const delta = (timestamp - prevTime) / 1000.0;
  prevTime = timestamp;

  const change = levels[currentLevel].update(delta, keysDown);

  if (change === -1) {
    if (currentLevel > 0) {
      currentLevel--;
    }
  } else if (change === 1) {
    if (currentLevel === levels.length - 1) {
      levels.push(new Level());
    }

    currentLevel++;
  }

  const canvas = document.getElementById("myCanvas");
  const player = levels[currentLevel].player;
  const cx = player.pos.x + player.size.x / 2;
  const cy = player.pos.y + player.size.y / 2;
  const camera = {
    x: floor(cx - canvas.width / 2),
    y: floor(cy - canvas.height / 2),
  };

  const context = canvas.getContext("2d");
  context.fillStyle = "black";
  context.fillRect(0, 0, canvas.width, canvas.height);

  levels[currentLevel].draw(canvas, context, camera, visibilityType);

  if (takeScreenshot) {
    window.open(document.getElementById("myCanvas").toDataURL("image/png"));
    takeScreenshot = false;
  }
}
window.requestAnimationFrame(tick);
