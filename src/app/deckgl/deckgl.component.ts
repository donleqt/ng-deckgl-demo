import {AfterViewInit, Component, EventEmitter, Input, NgZone, Output} from '@angular/core';
import {experimental, ScatterplotLayer, IconLayer, GeoJsonLayer} from 'deck.gl';
const {DeckGLJS, MapControllerJS} = experimental;

@Component({
  selector: 'app-deckgl',
  templateUrl: './deckgl.component.html',
  styleUrls: ['./deckgl.component.css']
})
export class DeckglComponent implements AfterViewInit {
  private deckgl;
  private containerId = 'deckCanvas';
  private controller: any;

  @Input() data;
  @Input() viewport;
  @Output() viewPortChange = new EventEmitter();
  @Output() mounted = new EventEmitter();

  constructor(public ngZone: NgZone) {
  }

  getViewportSize() {
    const el = document.getElementById(this.containerId);
    return {
      width: el.clientWidth,
      height: el.clientHeight
    };
  }

  getLayers() {
    return [
      new ScatterplotLayer({
        id: 'scatterplot-layer',
        data: this.data,
        radiusScale: 200,
        outline: false,
        getPosition: d => d.coordinates,
        getColor: d => [0, 188, 212],
      })
    ];
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      const {width, height} = this.getViewportSize();
      this.deckgl = new DeckGLJS({
        ...this.viewport,
        debug: true,
        layers: this.getLayers(),
        canvas: document.getElementById(this.containerId),
        width: width,
        height: height,
      });
      this.controller = new MapControllerJS({
        ...this.viewport,
        canvas: this.deckgl.canvas,
        onViewportChange: this.onViewportChange,
        width: width,
        height: height,
      });
      this.updateLayers();
    });
    this.mounted.emit(this);
  }

  updateLayers = () => {
    this.deckgl.setProps({
      layers: this.getLayers(),
      width: this.getViewportSize().width,
      height: this.getViewportSize().height,
    });
  }

  onViewportChange = (viewport) => {
    this.ngZone.runOutsideAngular(() => {
      this.viewport = viewport;
      this.controller.setProps(viewport);
      this.deckgl.setProps(viewport);
      this.updateLayers();
      this.viewPortChange.emit(viewport);
    });
  }

  public updateSize(data) {
    this.ngZone.runOutsideAngular(() => {
      this.controller.setProps(this.getViewportSize());
      this.updateLayers();
    });
  }
}
