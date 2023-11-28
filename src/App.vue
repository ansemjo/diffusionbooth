<script setup lang="ts">
import { ref, onMounted } from "vue";
import { hallucinate, presets } from "@/stablediffusion";

// invisible video stream for capture
let video = ref<HTMLVideoElement>();

// style selection
let style = ref<HTMLSelectElement>();

// capture preview element
let capture = ref<HTMLImageElement>();

// generated image element
let generated = ref<HTMLImageElement>();

// controlnet previews
let controlnet0 = ref<HTMLImageElement>();
let controlnet1 = ref<HTMLImageElement>();
let controlnet2 = ref<HTMLImageElement>();


onMounted(async () => {

  // start the video stream
  let stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  let vid = video.value!;
  vid.srcObject = stream;
  vid.play();

  // automatically capture on load
  if (true) {
    vid.addEventListener("canplay", async () => {
      console.log("READY");
      await screenshot();
    }, { once: true });
  };

});

async function screenshot() {
  await takeSquare(video.value!);
}

async function takeSquare(video: HTMLVideoElement) {

  // get the height from video for square
  let height = video.videoHeight;
  let left = (video.videoWidth - height)/2;
  console.log("Video", video, "is", video.videoHeight, video.videoWidth);
  console.log("Crop:", left, height);

  // create a new canvas for drawing
  let canvas = document.createElement("canvas");
  canvas.width = canvas.height = height;
  let ctx = canvas.getContext("2d")!;

  // draw inner square to canvas
  ctx.drawImage(video,
    left, 0, height, height,
       0, 0, height, height,
  );

  // set the capture to canvas contents
  capture.value!.src = canvas.toDataURL();

}

// get available preset functions
const presetOptions = Object.keys(presets);

async function mutate() {

  let imgdata = capture.value!.src.substring(22);

  let output: string[];
  let preset = style.value!.value as keyof typeof presets;
  if (!Object.keys(presets).includes(preset)) return;
  output = await presets[preset](imgdata);

  // set generated image and controlnet previews
  generated.value!.src   = output[0];
  controlnet0.value!.src = output[1];
  controlnet1.value!.src = output[2];
  controlnet2.value!.src = output[3];

}

</script>

<template>

<h2 class="title is-2">AI Photobooth</h2><br>

  <!-- invisible video stream -->
  <video autoplay="true" style="display: none;" ref="video"></video>

  <div class="controls">

    <button class="button is-danger" @click="screenshot">Shutter</button>
    <button class="button is-info" @click="mutate">Magic 🎉</button>

    <div class="field">
      <label class="label">Style Preset</label>
      <div class="control">
        <div class="select">
          <select ref="style">
            <option v-for="p in presetOptions">{{ p }}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="field">
      <label class="label">Gender</label>
      <div class="control">
        <div class="select">
          <select>
            <option>Unspecified</option>
            <option>Male</option>
            <option>Female</option>
          </select>
        </div>
      </div>
    </div>

  </div>

  <div class="content">

    <!-- capture preview and render -->
    <div class="images">

      <img src="/transparent.png" ref="capture">

      <div>
        <img src="/transparent.png" ref="generated">
        <!-- three small for controlnet display -->
        <div class="controlnets">
          <img src="/transparent.png" ref="controlnet0">
          <img src="/transparent.png" ref="controlnet1">
          <img src="/transparent.png" ref="controlnet2">
        </div>
      </div>


    </div>
    

  </div>
  
</template>

<style scoped>

img {
  height: 512px;
  background-color: darkgrey;
  border-radius: 1rem;
  border: solid 0.3rem white;
  aspect-ratio: 1/1;
  margin: 10px;
}

.images {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.controlnets {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
}

.controlnets > img {
  height: 155px;
}

</style>
