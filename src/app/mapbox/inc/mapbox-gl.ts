import {MapboxConfig} from './mapbox-config';
import * as MapboxGL from 'mapbox-gl/dist/mapbox-gl.js';
MapboxGL.accessToken = MapboxConfig.accessToken;
const {Map, NavigationControl} = MapboxGL;

export {Map, NavigationControl};
