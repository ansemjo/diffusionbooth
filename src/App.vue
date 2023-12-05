<script setup lang="ts">
import { ref, onMounted } from "vue";
import { presets, type Presets, type Preset } from "@/stablediffusion";
import { ages, type Ages, genders, type Genders } from "@/characterselection"
import GlitchyTitle from "@/GlitchyTitle.vue";

// video stream for camera capture
let preview = ref<HTMLVideoElement>();

// capture preview element
let snapshot = ref<HTMLImageElement>();
let snapped = ref<boolean>(false);

// generated image element
let diffusion = ref<HTMLImageElement>();

// controlnet previews
let ctlpose = ref<HTMLImageElement>();
let ctldepth = ref<HTMLImageElement>();
let ctledges = ref<HTMLImageElement>();

// character selection
let gender = ref<Genders>(genders[1]);
let age = ref<Ages>(ages[1]);

// style selection
const styles = presets;
let style = ref<Presets>("western");


onMounted(async () => {

  // start the video stream
  let stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  stream.getVideoTracks()[0].applyConstraints({ aspectRatio: 1/1 });
  preview.value!.srcObject = stream;
  // vid.play();

  // automatically capture on load
  preview.value!.addEventListener("canplay", async () => {
    // await capture();
  }, { once: true });

});

// capture a still image from camera feed
async function capture() {

  // get the height from video for square
  let camera = preview.value!;
  let height = camera.videoHeight;
  let left = (camera.videoWidth - height)/2;
  console.log("Video", camera, "is", camera.videoHeight, camera.videoWidth);
  console.log("Crop:", left, height);

  // create a new canvas for drawing
  let canvas = document.createElement("canvas");
  canvas.width = canvas.height = height;

  // draw inner square to canvas
  canvas.getContext("2d")!.drawImage(camera,
    left, 0, height, height,
       0, 0, height, height,
  );

  // set the preview to canvas contents
  snapshot.value!.src = canvas.toDataURL();
  snapped.value = true;

}

// send capture to stable-diffusion for transformation
async function hallucinate() {

  // capture is a data-uri, extract the base64 string
  let imgdata = snapshot.value!.src.substring(22);

  // check if a preset is selected
  if (style.value === undefined) {
    console.error("no style selected");
    return;
  }

  // run the diffusion with character arguments
  let output = await presets[style.value].func(imgdata, gender.value, age.value);

  // set generated image and controlnet previews
  diffusion.value!.src = output[0];
  ctlpose.value!.src  = output[1];
  ctldepth.value!.src = output[2];
  ctledges.value!.src = output[3];

}

</script>

<template>

  <div class="tile is-ancestor controls">

    <!-- left side: title and capture -->
    <div class="tile is-child">

      <GlitchyTitle></GlitchyTitle>

      <div class="field">
        <label class="label">Character Selection</label>
        <div class="buttons has-addons">
          <button v-for="key in ages" :class="{ 'is-success': age == key }" class="button is-medium" @click="age = key">{{ key }}</button>
        </div>
        <div class="buttons has-addons">
          <button v-for="key in genders" :class="{ 'is-link': gender == key }" class="button is-medium" @click="gender = key">{{ key }}</button>
        </div>
      </div>

      <div class="field">
        <label class="label">Preview</label>
        <div class="buttons has-addons">
          <button class="button is-medium is-warning" @click="capture">Capture</button>
          <button class="button is-medium is-danger" @click="snapped = false">Reset</button>
          <button class="button is-medium is-info" @click="hallucinate">Diffusion</button>
        </div>
      </div>

    </div>
    <!-- / left side -->


    <!-- right side: style presets -->
    <div class="tile is-child">

      <div class="field">
        <label class="label">Style Selection: {{ style !== undefined ? presets[style].label : "NONE" }}</label>
        <div class="stylegrid">
          <figure v-for="(value, key) in styles" class="image is-96x96">
            <img :class="{ 'selected': style === key }" @click="style = key" :title="value.label" :src="value.icon">
          </figure>
        </div>
      </div>

    </div>
    <!-- / right side -->

  </div>


  <div class="images">

    <div class="capture container framed">
      <!-- preview image from webcam -->
      <video autoplay="true" ref="preview" :hidden="snapped"></video>
      <!-- captured image -->
      <img src="/assets/transparent.png" ref="snapshot">
    </div>

    <div class="diffusion container">
      <div class="container framed">
        <!-- hallucinated image -->
        <img src="/assets/transparent.png" ref="diffusion">
      </div>
    </div>
    <div class="diffusion">
      <div class="controlnets">
        <!-- three small for controlnet display -->
        <img class="framed" src="/assets/controlnet/pose.png"  ref="ctlpose">
        <img class="framed" src="/assets/controlnet/depth.png" ref="ctldepth">
        <img class="framed" src="/assets/controlnet/edges.png" ref="ctledges">
      </div>
    </div>

  </div>

</template>

<style scoped>

.images {
  position: absolute;
  display: grid;
  grid-template-columns: 3fr 3fr 1fr;
  bottom: 1rem;
  width: 100%;
}
.images .framed {
  background-color: rgb(104, 104, 104);
  border-radius: 1rem;
  border: solid 0.3rem white;
  aspect-ratio: 1/1;
  /* margin: 0 auto; */
  /* display: block; */
  overflow: hidden;
}
.images .container {
  height: 512px;
  width: 512px;
}

.images video, .images img {
  height: 100%;
  object-fit: cover;
}

.images img {
  /* display: block; */
  transition: all ease 0.2s;
}

.images img:hover {
  scale: 1.03;
}

.images .framed img:hover {
  border-color: red;
}

.images .diffusion img:hover {
  border-color: yellow;
}

.diffusion {
  display: grid;
  grid-template-columns: 3fr 1fr;
}
.controlnets img {
  margin: 5px auto;
}


.controlnets {
  display: grid;
  grid-template-columns: 1fr;
}

.stylegrid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
}
.stylegrid figure {
  padding: 0.4rem;
}
.stylegrid img {
  /* margin: 0.2rem; */
  border-radius: 0.7rem;
  border: solid 0.2rem black;
  aspect-ratio: 1/1;
  transition: 0.2s ease;
}
.stylegrid img.selected {
  border-color: white;
  scale: 1.2;
}

.controlnets > img {
  height: 155px;
}

.buttons.has-addons button {
  width: 7rem;
  font-weight: bold;
}


</style>
