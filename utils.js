// better rand function that takes min/max and integer between them, much like Random.Next in .NET
Math.rand = function (min, max) {
  return Math.floor(Math.random() * (max - min) + min)
}

// a nice trick to make it easier to pick random items from an array
Array.prototype.random = function () {
  return this[Math.rand(0, this.length)]
}

// basic clamp function
Math.clamp = function (val, min, max) {
  return Math.min(Math.max(val, min), max)
}

// helper to map key values to names
var Keys = { Left: 37, Up: 38, Right: 39, Down: 40 }
