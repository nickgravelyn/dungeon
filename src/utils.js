// better rand function that takes min/max and integer between them, much like Random.Next in .NET
export function rand (min, max) {
  return Math.floor(Math.random() * (max - min) + min)
}

// a nice trick to make it easier to pick random items from an array
export function randomElement (array) {
  return array[rand(0, array.length)]
}

// basic clamp function
export function clamp (val, min, max) {
  return Math.min(Math.max(val, min), max)
}
