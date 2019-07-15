// Core
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';

// OpenLayers
import { Image as ImageLayer} from "ol/layer.js";
import Map from "ol/Map.js";
import View from "ol/View.js";
import Projection from "ol/proj/Projection.js";
import { Extent, getCenter, getTopLeft } from "ol/extent.js";
//import {defaults as defaultInteractions} from 'ol/interaction.js';
import * as easing from "ol/easing.js";
import * as ImageStatic from "ol/source/ImageStatic";
import { ImageCanvas } from "ol/source.js";

class EventEmitter {
  element: HTMLElement;

  on(eventName: string, callback: EventListenerOrEventListenerObject) : void {
    this.element.addEventListener(eventName, callback);
  }

  off(eventName: string, callback: EventListenerOrEventListenerObject) : void {
    this.element.removeEventListener(eventName, callback);
  }

  once(eventName: string, callback: EventListenerOrEventListenerObject) : void {
    this.element.addEventListener(eventName, callback, { once: true });
  }
}

class VideoElement extends EventEmitter {
  height: number = 0;
  width: number = 0;
  element: HTMLVideoElement = document.createElement("video");

  constructor(sourceURL: string) {
    super();
    this.on("canplay", () => {
      this.height = this.element.videoHeight;
      this.width = this.element.videoWidth;
    });
    let source = document.createElement("source");
    source.src = sourceURL;
    this.element.appendChild(source);
  }

  play() {
    this.element.play();
  }
  pause() {
    this.element.pause();
  }
}

@Component({
  selector: 'ol-map',
  templateUrl: './olMap.component.html',
  styleUrls: ['./olMap.component.css']
})
export class OlMapComponent implements OnInit {
  canvas: HTMLCanvasElement = document.createElement("canvas");
  context: CanvasRenderingContext2D = this.canvas.getContext("2d");
  hostElement: ElementRef;
  isPlaying: boolean = false;
  video: VideoElement = new VideoElement("https://www.w3schools.com/html/mov_bbb.mp4")
  //("https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_640x360.m4v");
  imageCanvas: ImageCanvas;
  projection: Projection;
  map: Map;
  playbackInterval: any;

  constructor(private host: ElementRef) { 
    this.hostElement = host;
    this.video.element.loop = true;
  }

  ngOnInit() {
    this.video.once("canplay", () => {
      console.log("ready");
      var extent = [0, 0, this.video.width, this.video.height];
      let projection = new Projection({
        code: "video",
        units: "pixels",
        extent: extent
      });
      this.imageCanvas = new ImageCanvas({
        canvasFunction: (
          extent: Extent,
          resolution: number,
          pixelRatio: number,
          size: number[],
          projection: Projection) =>
        {
          const width = size[0];
          const height = size[1];
          this.canvas.width = width;
          this.canvas.height = height;
          const scaleFactor = pixelRatio / resolution;
          this.context.scale(scaleFactor, scaleFactor);
          this.context.translate(-extent[0], extent[3] - this.video.height);
          this.context.fillStyle = "#FF0000";
          this.context.drawImage(this.video.element, 0, 0);
          return this.canvas;
        },
      });
      var imageLayer = new ImageLayer({ source: this.imageCanvas })
      let view = new View({
        center: getCenter(extent),
        extent: extent,
        projection: this.projection,
        resolution: 1,
        minResolution: 0.1,
        maxResolution: 10
      });
      this.map = new Map({
        layers: [
          imageLayer
        ],
        target: this.hostElement.nativeElement.firstElementChild,
        view: view
      });
      this.zoomBestFit();
    });
  }

  renderVideo() {
    this.imageCanvas.refresh();
    if (this.isPlaying) {
      setTimeout(() => this.renderVideo(), 1000 / 60);
    }
  }

  togglePlayback() {
    if (this.video.element.paused) {
      this.video.play();
      this.isPlaying = true;
      this.playbackInterval = setTimeout(() => this.renderVideo(), 1000 / 60); 
    } else {
      this.video.pause();
      this.isPlaying = false;
    }
  }

  resetView() {
    this.map.getView().setRotation(0);
    this.zoomBestFit();
  }

  zoomBestFit() {
    let view = this.map.getView();
    let extent = [0, 0, this.video.width, this.video.height];
    view.fit(extent, this.map.getSize());
    view.setCenter(getCenter(extent));
  }

  zoomFull() {
    this.map.getView().setResolution(1);
  }

  zoomByDelta(delta: number) {
    let view = this.map.getView();
    delta = delta || 1;
    var currentResolution = view.getResolution();
    if (currentResolution) {
      var newResolution = view.constrainResolution(currentResolution, delta);
      if (view.getAnimating()) {
        view.cancelAnimations();
      }
      view.animate({
        resolution: newResolution,
        duration: 250,
        easing: easing.easeOut
      });
    }
  }

  zoomIn() {
    this.zoomByDelta(1);
  }

  zoomOut() {
    this.zoomByDelta(-1);
  }
}