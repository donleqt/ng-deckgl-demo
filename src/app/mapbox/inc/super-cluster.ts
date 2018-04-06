import * as kdbush from 'kdbush';

export {SuperCluster};

class SuperCluster {
  options = {
    minZoom: 0,   // min zoom to generate clusters on
    maxZoom: 16,  // max zoom level to cluster the points on
    radius: 200,   // cluster radius in pixels
    extent: 512,  // tile extent (radius is calculated relative to it)
    nodeSize: 64, // size of the KD-tree leaf node, affects performance
    log: false,   // whether to log timing info

    // a reduce function for calculating custom cluster properties
    reduce: null, // function (accumulated, props) { accumulated.sum += props.sum; }

    // initial properties of a cluster (before running the reducer)
    initial: function () {
      return {};
    }, // function () { return {sum: 0}; },

    // properties to use for individual points when running the reducer
    map: function (props) {
      return props;
    } // function (props) { return {sum: props.my_value}; },
  };
  private trees: any[];
  private points: any[];

  constructor(options) {
    this.options = {
      ...this.options,
      ...options
    };
    this.trees = new Array(this.options.maxZoom + 1);
  }

  load = (points) => {
    const log = this.options.log;

    if (log) console.time('total time');

    const timerId = 'prepare ' + points.length + ' points';
    if (log) console.time(timerId);

    this.points = points;

    // generate a cluster object for each point and index input points into a KD-tree
    let clusters = [];
    for (let i = 0; i < points.length; i++) {
      if (!points[i].geometry) {
        continue;
      }
      clusters.push(createPointCluster(points[i], i));
    }
    this.trees[this.options.maxZoom + 1] = kdbush(clusters, getX, getY, this.options.nodeSize, Float32Array);

    if (log) console.timeEnd(timerId);

    // cluster points on max zoom, then cluster the results on previous zoom, etc.;
    // results in a cluster hierarchy across zoom levels
    for (let z = this.options.maxZoom; z >= this.options.minZoom; z--) {
      let now = +Date.now();

      // create a new set of clusters for the zoom and index them with a KD-tree
      clusters = this._cluster(clusters, z);
      this.trees[z] = kdbush(clusters, getX, getY, this.options.nodeSize, Float32Array);

      if (log) console.log('z%d: %d clusters in %dms', z, clusters.length, +Date.now() - now);
    }
    if (log) console.timeEnd('total time');
    return this;
  }

  getClusters = (bbox, zoom) => {
    if (bbox[0] > bbox[2]) {
      const easternHem = this.getClusters([bbox[0], bbox[1], 180, bbox[3]], zoom);
      const westernHem = this.getClusters([-180, bbox[1], bbox[2], bbox[3]], zoom);
      return easternHem.concat(westernHem);
    }

    const tree = this.trees[this._limitZoom(zoom)];
    const ids = tree.range(lngX(bbox[0]), latY(bbox[3]), lngX(bbox[2]), latY(bbox[1]));
    const clusters = [];
    for (let i = 0; i < ids.length; i++) {
      const c = tree.points[ids[i]];
      clusters.push(c.numPoints ? getClusterJSON(c) : this.points[c.id]);
    }
    return clusters;
  }

  getChildren = (clusterId) => {
    const originId = clusterId >> 5;
    const originZoom = clusterId % 32;
    const errorMsg = 'No cluster with the specified id.';

    const index = this.trees[originZoom];
    if (!index) {
      throw new Error(errorMsg);
    }

    const origin = index.points[originId];
    if (!origin) {
      throw new Error(errorMsg);
    }

    const r = this.options.radius / (this.options.extent * Math.pow(2, originZoom - 1));
    const ids = index.within(origin.x, origin.y, r);
    const children = [];
    for (let i = 0; i < ids.length; i++) {
      const c = index.points[ids[i]];
      if (c.parentId === clusterId) {
        children.push(c.numPoints ? getClusterJSON(c) : this.points[c.id]);
      }
    }

    if (children.length === 0) {
      throw new Error(errorMsg);
    }

    return children;
  }


  getLeaves = (clusterId, limit, offset) => {
    limit = limit || 10;
    offset = offset || 0;

    const leaves = [];
    this._appendLeaves(leaves, clusterId, limit, offset, 0);

    return leaves;
  }

  getTile = (z, x, y) => {
    const tree = this.trees[this._limitZoom(z)];
    const z2 = Math.pow(2, z);
    const extent = this.options.extent;
    const r = this.options.radius;
    const p = r / extent;
    const top = (y - p) / z2;
    const bottom = (y + 1 + p) / z2;

    const tile = {
      features: []
    };

    this._addTileFeatures(
      tree.range((x - p) / z2, top, (x + 1 + p) / z2, bottom),
      tree.points, x, y, z2, tile);

    if (x === 0) {
      this._addTileFeatures(
        tree.range(1 - p / z2, top, 1, bottom),
        tree.points, z2, y, z2, tile);
    }
    if (x === z2 - 1) {
      this._addTileFeatures(
        tree.range(0, top, p / z2, bottom),
        tree.points, -1, y, z2, tile);
    }

    return tile.features.length ? tile : null;
  }

  getClusterExpansionZoom = (clusterId) => {
    let clusterZoom = (clusterId % 32) - 1;
    while (clusterZoom < this.options.maxZoom) {
      const children = this.getChildren(clusterId);
      clusterZoom++;
      if (children.length !== 1) break;
      clusterId = children[0].properties.clusterId;
    }
    return clusterZoom;
  }

  _appendLeaves = (result, clusterId, limit, offset, skipped) => {
    const children = this.getChildren(clusterId);

    for (let i = 0; i < children.length; i++) {
      const props = children[i].properties;

      if (props && props.cluster) {
        if (skipped + props.pointCount <= offset) {
          // skip the whole cluster
          skipped += props.pointCount;
        } else {
          // enter the cluster
          skipped = this._appendLeaves(result, props.clusterId, limit, offset, skipped);
          // exit the cluster
        }
      } else if (skipped < offset) {
        // skip a single point
        skipped++;
      } else {
        // add a single point
        result.push(children[i]);
      }
      if (result.length === limit) {
        break
      }
    }

    return skipped;
  }

  _addTileFeatures = (ids, points, x, y, z2, tile) => {
    for (let i = 0; i < ids.length; i++) {
      const c = points[ids[i]];
      tile.features.push({
        type: 1,
        geometry: [[
          Math.round(this.options.extent * (c.x * z2 - x)),
          Math.round(this.options.extent * (c.y * z2 - y))
        ]],
        tags: c.numPoints ? getClusterProperties(c) : this.points[c.id].properties
      });
    }
  }

  _limitZoom = (z) => {
    return Math.max(this.options.minZoom, Math.min(z, this.options.maxZoom + 1));
  }

  _cluster = (points, zoom) => {
    const clusters = [];
    const r = this.options.radius / (this.options.extent * Math.pow(2, zoom));

    // loop through each point
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      // if we've already visited the point at this zoom level, skip it
      if (p.zoom <= zoom) {
        continue;
      }
      p.zoom = zoom;

      // find all nearby points
      const tree = this.trees[zoom + 1];
      const neighborIds = tree.within(p.x, p.y, r);

      let numPoints = p.numPoints || 1;
      let wx = p.x * numPoints;
      let wy = p.y * numPoints;

      let clusterProperties = null;

      if (this.options.reduce) {
        clusterProperties = this.options.initial();
        this._accumulate(clusterProperties, p);
      }

      // encode both zoom and point index on which the cluster originated
      const id = (i << 5) + (zoom + 1);

      for (let j = 0; j < neighborIds.length; j++) {
        const b = tree.points[neighborIds[j]];
        // filter out neighbors that are already processed
        if (b.zoom <= zoom) {
          continue;
        }

        b.zoom = zoom; // save the zoom (so it doesn't get processed twice)

        const numPoints2 = b.numPoints || 1;
        wx += b.x * numPoints2; // accumulate coordinates for calculating weighted center
        wy += b.y * numPoints2;

        numPoints += numPoints2;
        b.parentId = id;

        if (this.options.reduce) {
          this._accumulate(clusterProperties, b);
        }
      }

      if (numPoints === 1) {
        clusters.push(p);
      } else {
        p.parentId = id;
        clusters.push(createCluster(wx / numPoints, wy / numPoints, id, numPoints, clusterProperties));
      }
    }

    return clusters;
  }

  _accumulate = (clusterProperties, point) => {
    const properties = point.numPoints ?
      point.properties :
      this.options.map(this.points[point.id].properties);

    this.options.reduce(clusterProperties, properties);
  }
}


function createCluster(x, y, id, numPoints, properties) {
  return {
    x: x, // weighted cluster center
    y: y,
    zoom: Infinity, // the last zoom the cluster was processed at
    id: id, // encodes index of the first child of the cluster and its zoom level
    parentId: -1, // parent cluster id
    numPoints: numPoints,
    properties: properties
  };
}

function createPointCluster(p, id) {
  const coords = p.geometry.coordinates;
  return {
    x: lngX(coords[0]), // projected point coordinates
    y: latY(coords[1]),
    zoom: Infinity, // the last zoom the point was processed at
    id: id, // index of the source feature in the original input array
    parentId: -1 // parent cluster id
  };
}

function getClusterJSON(cluster) {
  return {
    type: 'Feature',
    properties: getClusterProperties(cluster),
    geometry: {
      type: 'Point',
      coordinates: [xLng(cluster.x), yLat(cluster.y)]
    }
  };
}

function getClusterProperties(cluster) {
  const count = cluster.numPoints;
  const abbrev =
    count >= 10000 ? Math.round(count / 1000) + 'k' :
      count >= 1000 ? (Math.round(count / 100) / 10) + 'k' : count;
  return extend(extend({}, cluster.properties), {
    cluster: true,
    clusterId: cluster.id,
    pointCount: count,
    pointCountBeauty: abbrev
  });
}

// longitude/latitude to spherical mercator in [0..1] range
function lngX(lng) {
  return lng / 360 + 0.5;
}
function latY(lat) {
  const sin = Math.sin(lat * Math.PI / 180),
    y = (0.5 - 0.25 * Math.log((1 + sin) / (1 - sin)) / Math.PI);
  return y < 0 ? 0 : y > 1 ? 1 : y;
}

// spherical mercator to longitude/latitude
function xLng(x) {
  return (x - 0.5) * 360;
}
function yLat(y) {
  const y2 = (180 - y * 360) * Math.PI / 180;
  return 360 * Math.atan(Math.exp(y2)) / Math.PI - 90;
}

function extend(dest, src) {
  for (const id in src) {
    dest[id] = src[id];
  }
  return dest;
}

function getX(p) {
  return p.x;
}
function getY(p) {
  return p.y;
}
