<script setup lang="ts">
import { ref, onMounted } from "vue";
import { presets, type Presets, type Preset } from "@/stablediffusion";
import { ages, type Ages, genders, type Genders } from "@/characterselection"
import GlitchyTitle from "@/GlitchyTitle.vue";

// video stream for camera capture
let preview = ref<HTMLVideoElement>();

// capture preview element
let snapshot = ref<HTMLImageElement>();
let image = ref<string | null>(null);

// generated image element
let diffusion = ref<HTMLImageElement>();

// controlnet previews
let ctlpose = ref<HTMLImageElement>();
let ctldepth = ref<HTMLImageElement>();
let ctledges = ref<HTMLImageElement>();

// character selection
let gender = ref<Genders>();
let age = ref<Ages>();

// style preset selection
let preset = ref<Presets>();

// initialize once
onMounted(async () => {

  // start the video stream
  let stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  stream.getVideoTracks()[0].applyConstraints({ aspectRatio: 1/1 }); // NOP on firefox
  preview.value!.srcObject = stream;

});

// keybindings
document.addEventListener("keydown", (ev) => {

  // shift-S triggers capture/retake
  if (ev.shiftKey && ev.key === "S") {
    console.log("Capture/Retake hotkey (shift-S) pressed")
    return image.value === null ? take_snapshot() : clear_snapshot();
  };

});

// whether to begin hallucination automatically
const autohallucinate = false;

// capture a still image from camera feed
function take_snapshot() {

  // early-exit, if ref is undefined
  if (preview.value === undefined || preview.value.paused) {
    console.error("camera feed not available yet");
    return;
  }

  // refuse to update snapshot, if diffusion is running
  if (diffusion_inflight.value === true) {
    console.debug("diffusion running, won't capture new image");
    return;
  }

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
  image.value = canvas.toDataURL();

  // automatically start hallucination with current settings on photo
  if (gender.value !== undefined && age.value !== undefined && preset.value !== undefined) {
    hallucinate();
  }

}

// reset snapshot and enable live view for capture
function clear_snapshot() {
  snapshot.value!.src = "/assets/transparent.png";
  image.value = null;
}

// select a gender via button
function select_gender(value: Genders) {
  gender.value = value;
  hallucinate();
}

// select an age via button
function select_age(value: Ages) {
  age.value = value;
  hallucinate();
}

// select a style from preview grid
function select_preset(value: Presets) {
  preset.value = value;
  hallucinate();
}

// clear all selections and preview image
function clear_all() {
  gender.value = undefined;
  age.value = undefined;
  preset.value = undefined;
  clear_snapshot();
}

// is a diffusion currently in-flight?
const diffusion_inflight = ref<boolean>(false);

// send capture to stable-diffusion for transformation
async function hallucinate() {

  // prevent multiple inflight
  if (diffusion_inflight.value) {
    console.warn("another request is already processing!");
    return;
  }

  // don't run if not everything is selected
  if (gender.value === undefined || age.value === undefined || preset.value === undefined) {
    console.warn("make a selection!");
    return;
  }

  // start polling progress
  let poll = { timeout: 0 };
  (async () => {
    progress.value = 0.0;
    await poll_progress();
    poll_rearm(poll);
  })();

  try {

    // mark request in-flight
    diffusion_inflight.value = true;

    // capture is a data-uri, extract the base64 string
    let imgdata = image.value!.substring(22);
    
    // check if a preset is selected
    if (preset.value === undefined) {
      console.error("no style selected");
      return;
    }
    
    // run the diffusion with character arguments
    let output = await presets[preset.value].func(imgdata, gender.value, age.value);
    
    // set generated image and controlnet previews
    diffusion.value!.src = output[0];
    ctlpose.value!.src  = output[1];
    ctldepth.value!.src = output[2];
    ctledges.value!.src = output[3];

  } finally {
    diffusion_inflight.value = false;
    clearTimeout(poll.timeout);
    progress.value = 0.0;
  }

}

function poll_rearm(poll: { timeout: number }) {
  if (diffusion_inflight.value === false) return;
  poll.timeout = setTimeout(async () => {
    await poll_progress();
    poll_rearm(poll);
  }, 100);
};


const progressbar = ref<HTMLProgressElement>();
const progress = ref<number>(0.0);
async function poll_progress() {
  let request = await fetch("/sdapi/v1/progress?skip_current_image=true", { headers: { "accept": "application/json" } });
  let prg = (await request.json()).progress;
  if (typeof prg === "number") {
    console.log("progress:", prg);
    if (prg > 0.1) {
      progressbar.value!.value = prg;
    } else {
      progressbar.value!.removeAttribute("value");
    }
  };
}

</script>

<template>

  <div id="pageroot">

    <!-- glitchy title -->
    <div id="glitchytitle">
      <GlitchyTitle></GlitchyTitle>
    </div>

    <div id="leftside">

      <!-- picture capture controls -->
      <div id="capturecontrol">
        <div class="field">
          <label class="label">1. Capture Snapshot</label>
          <div class="buttons has-addons">
            <button class="button is-medium is-success" @click="take_snapshot"  v-if="image === null">Capture!</button>
            <button class="button is-medium is-warning" @click="clear_snapshot" v-if="image !== null">Retake</button>
            <!-- <button class="button is-medium is-info" @click="hallucinate">Diffusion</button> -->
            <button class="button is-medium is-danger" @click="clear_all">Clear All</button>
          </div>
        </div>
      </div>

      <!-- character selection buttons -->
      <div id="characterselection">
        <div class="field"> <!-- character traits -->
          <label class="label" :class="{ 'has-text-danger': age === undefined || gender === undefined }">
            2. Choose your Character
          </label>
          <div class="buttons has-addons">
            <button v-for="key in ages" :class="{ 'is-success': age == key }" class="button is-medium" @click="select_age(key)">{{ key }}</button>
          </div>
          <div class="buttons has-addons">
            <button v-for="key in genders" :class="{ 'is-link': gender == key }" class="button is-medium" @click="select_gender(key)">{{ key }}</button>
          </div>
        </div>
      </div>
  
      <!-- style presets -->
      <div id="styleselection">
        <div class="field">
          <label class="label" :class="{ 'has-text-danger': preset === undefined }">
            3. Select Style: {{ preset !== undefined ? presets[preset].label : "NONE" }}
          </label>
          <div id="stylegrid">
            <figure v-for="(value, key) in presets" class="image container">
              <img :class="{ 'selected': preset === key }" @click="select_preset(key)" :title="value.label" :src="value.icon">
              <div class="overlay">
                <span>clear snapshot</span>
              </div>
            </figure>
          </div>
        </div>
      </div>
  
      <!-- camera preview -->
      <div id="cameraimg" class="images">
        <div class="container framed">
          <!-- video stream from webcam -->
          <video autoplay="true" ref="preview"></video>
          <!-- captured image -->
          <img src="/assets/transparent.png" ref="snapshot">
          <div class="overlay do-clear" @click="clear_snapshot" v-if="image !== null">
            <span>clear snapshot</span>
          </div>
          <div class="overlay do-snapshot" @click="take_snapshot" v-if="image === null">
            <span>take snapshot</span>
          </div>
        </div>
      </div>

    </div>


    <div id="rightlane">

      <!-- controlnet previews -->
      <div id="controlnets" class="images">
        <!-- three small for controlnet display -->
        <div class="container framed">
          <img src="/assets/controlnet/pose.png"  ref="ctlpose">
          <div class="overlay"><span>pose detection</span></div>
        </div>
        <div class="container framed">
          <img src="/assets/controlnet/depth.png" ref="ctldepth">
          <div class="overlay"><span>depth map</span></div>
        </div>
        <div class="container framed">
          <img src="/assets/controlnet/edges.png" ref="ctledges">
          <div class="overlay"><span>soft edges</span></div>
        </div>
      </div>

      <!-- diffusion image -->
      <div id="diffusionimg" class="images">
        <progress class="progress is-small is-success" max="1" style="margin-bottom: 0.8rem;" ref="progressbar" v-show="diffusion_inflight">diffusion</progress>
        <div class="container framed">
          <!-- hallucinated image -->
          <img src="/assets/transparent.png" ref="diffusion">
          <div class="overlay">
            <span>TODO: QR code</span>
          </div>
        </div>
      </div>

    </div>


  </div>

</template>

<style scoped>

.overlay, #cameraimg img {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100%;
  width: 100%;
}
.overlay {
  opacity: 0.0;
  transition: .3s ease;
  background-color: #fff9;
}

.overlay.do-clear {
  background-color: hsla(0, 90%, 60%, 0.4);
}
.overlay.do-capture {
  background-color: hsla(220, 90%, 60%, 0.4);
}


.container:hover .overlay {
  opacity: 1.0;
}

.overlay > span {
  color: black;
  font-size: 2rem;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  cursor: default;
}

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
  grid-template-columns: auto 450px;
  grid-template-areas:
    "readme character"
    "capture styles"
    "camera  styles";
}

#rightlane {
  grid-area: rightlane;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr 3.1fr;
  align-items: center;
  justify-items: auto;
  /* grid-template-areas:
    "diffusion"
    "controlnets"; */
}

.label {
  font-size: 1.4rem;
}

#capturecontrol {
  grid-area: capture;
  justify-self: center;
  align-self: end;
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
  align-self: center;
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
#controlnets .framed {
  border: none;
}

.framed {
  background-color: rgb(104, 104, 104);
  border-radius: 1rem;
  border: solid 0.3rem white;
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

#stylegrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}
#stylegrid figure {
  width: 120px;
  padding: 0.5rem;
  cursor: pointer;
}
#stylegrid img {
  border-radius: 0.7rem;
  border: none;
  aspect-ratio: 1/1;
  transition: 0.15s ease;
}
#stylegrid img:hover {
  scale: 1.1;
}
#stylegrid img.selected {
  border: solid 0.4rem greenyellow;
  scale: 1.2;
}
#stylegrid .overlay {
  height: calc(100% - 1rem);
  width: calc(100% - 1rem);
  border-radius: 0.7rem;
  margin: 0.5rem;
}

</style>
