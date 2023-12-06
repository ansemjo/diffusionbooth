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

  <div id="pageroot">

    <!-- glitchy title -->
    <div id="glitchytitle">
      <GlitchyTitle></GlitchyTitle>
    </div>

    <div id="leftside">
      
      <!-- character selection buttons -->
      <div id="characterselection">
        <div class="field"> <!-- character traits -->
          <label class="label">Character Selection</label>
          <div class="buttons has-addons">
            <button v-for="key in ages" :class="{ 'is-success': age == key }" class="button is-medium" @click="age = key">{{ key }}</button>
          </div>
          <div class="buttons has-addons">
            <button v-for="key in genders" :class="{ 'is-link': gender == key }" class="button is-medium" @click="gender = key">{{ key }}</button>
          </div>
        </div>
        <div class="field"> <!-- TODO: action buttons -->
          <label class="label">Preview</label>
          <div class="buttons has-addons">
            <button class="button is-medium is-warning" @click="capture">Capture</button>
            <button class="button is-medium is-danger" @click="snapped = false">Reset</button>
            <button class="button is-medium is-info" @click="hallucinate">Diffusion</button>
          </div>
        </div>
      </div>
  
      <!-- style presets -->
      <div id="styleselection">
        <div class="field">
          <label class="label">Style Selection: {{ style !== undefined ? presets[style].label : "NONE" }}</label>
          <div id="stylegrid">
            <figure v-for="(value, key) in styles" class="image">
              <img :class="{ 'selected': style === key }" @click="style = key" :title="value.label" :src="value.icon">
            </figure>
          </div>
        </div>
      </div>
  
      <!-- camera preview -->
      <div id="cameraimg" class="images">
        <div class="container framed">
          <!-- video stream from webcam -->
          <video autoplay="true" ref="preview" :hidden="snapped"></video>
          <!-- captured image -->
          <img src="/assets/transparent.png" ref="snapshot">
        </div>
      </div>

    </div>


    <div id="rightlane">

      <!-- controlnet previews -->
      <div id="controlnets" class="images">
        <!-- three small for controlnet display -->
        <img class="framed" src="/assets/controlnet/pose.png"  ref="ctlpose"  title="pose detection">
        <img class="framed" src="/assets/controlnet/depth.png" ref="ctldepth" title="depth map">
        <img class="framed" src="/assets/controlnet/edges.png" ref="ctledges" title="soft edges">
      </div>

      <!-- diffusion image -->
      <div id="diffusionimg" class="images">
        <div class="container framed">
          <!-- hallucinated image -->
          <img src="/assets/transparent.png" ref="diffusion">
        </div>
      </div>

    </div>


  </div>

</template>

<style scoped>

#pageroot {
  display: grid;
  grid-template-columns: 3fr 700px;
  grid-template-rows: auto;
  /* grid-template-areas:
    "title     title      diffusion"
    "character camera     diffusion"
    "styles camera controlnets" */
  grid-template-areas:
    "title    rightlane"
    "leftside rightlane"
    "leftside rightlane";
}

#leftside {
  grid-area: leftside;
  display: grid;
  grid-template-columns: 400px auto;
  grid-template-areas:
    "character ."
    "styles camera";
}

#rightlane {
  grid-area: rightlane;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr 3fr;
  align-items: center;
  justify-items: auto;
  /* grid-template-areas:
    "diffusion"
    "controlnets"; */
}

#glitchytitle {
  grid-area: title;
}

#characterselection {
  grid-area: character;
  justify-self: start;
}
#characterselection button {
  width: 8rem;
  font-weight: bold;
}

#styleselection {
  grid-area: styles;
}

#cameraimg {
  grid-area: camera;
}

#diffusionimg, #cameraimg {
  align-self: end;
}

#controlnets {
  /* grid-area: controlnets; */
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  justify-items: center;
}
#controlnets img {
  height: 200px;
}

.framed {
  background-color: rgb(104, 104, 104);
  border-radius: 1rem;
  border: solid 0.15rem white;
  overflow: hidden;
  aspect-ratio: 1/1;
}
#cameraimg .container {
  height: 512px;
  width: 512px;
}

.images video, .images img {
  height: 100%;
  object-fit: cover;
}

.images .framed {
  transition: all ease 0.2s;
}

.images .framed:hover {
  scale: 1.03;
}

#cameraimg .framed:hover {
  border-color: red;
}


#stylegrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}
#stylegrid figure {
  width: 120px;
  padding: 0.5rem;
}
#stylegrid img {
  border-radius: 0.7rem;
  border: solid 0.4rem black;
  aspect-ratio: 1/1;
  transition: 0.15s ease;
}
#stylegrid img:hover {
  scale: 1.1;
}
#stylegrid img.selected {
  border-color: greenyellow;
  scale: 1.2;
}

</style>
