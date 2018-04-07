import {AfterViewInit, Component} from '@angular/core';
import {clusteredPoints} from './inc/sample-data';
import {createMarker, Map, NavigationControl} from './inc/mapbox-gl';

@Component({
  selector: 'app-mapbox',
  templateUrl: './mapbox.component.html',
  styleUrls: [
    './mapbox.component.css'
  ]
})
export class MapboxComponent implements AfterViewInit {
  private _map = null;

  private _inBoundMarkers = [];

  constructor() {
    this.onMapChanged = this.onMapChanged.bind(this);
  }

  initMap() {
    this._map = new Map({
      container: 'mapContainer',
      style: 'mapbox://styles/mapbox/streets-v9',
      center: [106.660172, 10.762622],
      maxZoom: 16,
      zoom: 10
    });
    this._map.addControl(new NavigationControl({
      showCompass: false
    }), 'top-left');
    ['load', 'zoomend', 'resize', 'dragend'].map(event => {
      this._map.on(event, this.onMapChanged);
    });
  }

  /**
   * Handle map change event, remap markers
   */
  onMapChanged() {
    const {_sw, _ne} = this._map.getBounds();
    this._inBoundMarkers.map(e => {
      e.remove();
    });
    const points = clusteredPoints.getClusters([_sw.lng, _sw.lat, _ne.lng, _ne.lat], Math.floor(this._map.getZoom()));
    this._inBoundMarkers = points.map(createMarker).map(e => {
      e.addTo(this._map);
      return e;
    });
  }

  ngAfterViewInit() {
    this.initMap();
  }

}
