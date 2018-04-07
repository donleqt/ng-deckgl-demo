import {AfterViewInit, Component, EventEmitter, Input, NgZone, OnChanges, Output} from '@angular/core';
import {Map, NavigationControl} from './inc/mapbox-gl';

@Component({
  selector: 'app-mapbox',
  templateUrl: './mapbox.component.html',
  styleUrls: [
    './mapbox.component.css'
  ]
})
export class MapboxComponent implements AfterViewInit, OnChanges {
  private _map = null;
  @Input() viewport;
  @Output() mapResize = new EventEmitter();

  constructor(public ngZone: NgZone) {
  }

  ngOnChanges(changes) {
    if (this._map && changes.viewport) {
      this._map.flyTo(this.convertViewportData());
    }
  }

  initMap() {
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        this._map = new Map({
          container: 'mapContainer',
          style: 'mapbox://styles/mapbox/dark-v9',
          ...this.convertViewportData()
        });
        this._map.addControl(new NavigationControl({
          showCompass: false
        }), 'top-left');
        this._map.on('resize', this.onResize);
      });
    });
  }

  onResize = () => {
    if (this._map) {
      const c = this._map.getCanvas();
      this.mapResize.emit({
        height: c.height,
        width: c.width
      });
    }
  }

  convertViewportData() {
    const {
      zoom,
      bearing,
      pitch,
      longitude,
      latitude,
      maxZoom,
      minZoom,
    } = this.viewport;
    return {
      duration: 0,
      bearing,
      pitch,
      zoom,
      maxZoom,
      minZoom,
      center: [longitude, latitude]
    };
  }

  ngAfterViewInit() {
    this.initMap();
  }

}
