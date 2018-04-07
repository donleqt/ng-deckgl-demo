import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';


import { AppComponent } from './app.component';
import { MapboxComponent } from './mapbox/mapbox.component';
import { DeckglComponent } from './deckgl/deckgl.component';


@NgModule({
  declarations: [
    AppComponent,
    MapboxComponent,
    DeckglComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
