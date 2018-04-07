import {MapboxConfig} from './mapbox-config';
import * as MapboxGL from 'mapbox-gl/dist/mapbox-gl.js';
MapboxGL.accessToken = MapboxConfig.accessToken;
const {Map, Marker, NavigationControl} = MapboxGL;

function createMarker(point) {
  let icon = null;
  if (point.properties.cluster) {
    icon = makeClusterIcon(point.properties);
  }
  return new Marker(icon).setLngLat(point.geometry.coordinates);
}

function makeClusterIcon(property) {
  const span = document.createElement('SPAN');
  const size = property.pointCount < 100 ? 'small' :
    property.point_count < 1000 ? 'medium' : 'large';

  span.className = `circle-cluster circle-cluster--${size}`;
  span.innerText = property.pointCountBeauty;
  return span;
}

export {Map, createMarker, NavigationControl};
