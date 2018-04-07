const points = [];
/**
 * Generate 1 milion point
 */
for (let i = 0; i < 1000000; i++) {
  points.push({
    type: 'Point',
    coordinates: [
      rangeRandom(102.22939, 107.63940123),
      rangeRandom(10.22939, 27.9123981)
    ]
  });
}
function rangeRandom(min, max) {
  return Math.random() * (max - min) + min;
}

export {points};

