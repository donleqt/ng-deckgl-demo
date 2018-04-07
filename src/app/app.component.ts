import {ApplicationRef, Component} from '@angular/core';
import {points} from './sample-data';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  viewPortData = {
    latitude: 10.762622,
    longitude: 106.660172,
    zoom: 12,
    pitch: 0,
    bearing: 0
  };

  viewportRef;

  sourceData = points;

  constructor(private ref: ApplicationRef) {
  }

  onViewportChange(data) {
    this.viewPortData = data;
    this.ref.tick();
  }

  onMapResize(data) {
    if (this.viewportRef) {
      this.viewportRef.updateSize(data);
    }
  }

  onViewportMounted(ref) {
    this.viewportRef = ref;
  }
}
