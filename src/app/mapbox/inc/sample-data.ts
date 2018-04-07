import {SuperCluster} from './super-cluster';

const points = [];
/**
 * Generate 1 milion point
 */
for (let i = 0; i < 1000000; i++) {
  points.push({
    type: 'Item',
    properties: {
      index: i
    },
    geometry: {
      type: 'Point',
      coordinates: [
        rangeRandom(105.22939, 108.23940123),
        rangeRandom(10.22939, 30.0123981)
      ]
    }
  });
}

const clusteredPoints = new SuperCluster({
  log: true,
  maxZoom: 12,
  radius: 50
}).load(points);

function rangeRandom(min, max) {
  return Math.random() * (max - min) + min;
}

export {clusteredPoints};

