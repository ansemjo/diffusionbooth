<script setup lang="ts">
import { ref, onMounted } from "vue";
import { presets, type Presets, type Preset } from "@/stablediffusion";
import { ages, type Ages, genders, type Genders } from "@/characterselection"
import GlitchyTitle from "@/GlitchyTitle.vue";
import qrcode from "qrcode.vue";

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

// capture a still image from camera feed
function take_snapshot() {

  // early-exit, if ref is undefined
  if (preview.value === undefined || preview.value.paused) {
    console.error("camera feed not available yet");
    return;
  }

  // refuse to update snapshot, if diffusion is running
  if (diffusion_inflight.value === true) return;

  // get the height from video for square
  let camera = preview.value!;
  let height = camera.videoHeight;
  let left = (camera.videoWidth - height)/2;

  // create a new canvas for drawing
  let canvas = document.createElement("canvas");
  canvas.width = canvas.height = height;

  // draw inner square to canvas
  let ctx = canvas.getContext("2d")!;
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(camera,
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
  if (diffusion_inflight.value === true) return;
  snapshot.value!.src = "/assets/transparent.png";
  image.value = null;
}

// select a gender via button
function select_gender(value: Genders) {
  if (diffusion_inflight.value === true) return;
  gender.value = value;
  hallucinate();
}

// select an age via button
function select_age(value: Ages) {
  if (diffusion_inflight.value === true) return;
  age.value = value;
  hallucinate();
}

// select a style from preview grid
function select_preset(value: Presets) {
  if (diffusion_inflight.value === true) return;
  preset.value = value;
  hallucinate();
}

// clear all selections and preview image
function clear_all() {
  gender.value = undefined;
  age.value = undefined;
  preset.value = undefined;
  clear_snapshot();
  downlink.value = undefined;
}

// is a diffusion currently in-flight?
const diffusion_inflight = ref<boolean>(false);

// send capture to stable-diffusion for transformation
async function hallucinate() {

  // prevent multiple inflight
  if (diffusion_inflight.value === true) {
    console.warn("another request is already processing!");
    return;
  }

  // don't run if not everything is selected
  if (gender.value === undefined || age.value === undefined || preset.value === undefined) {
    console.warn("make a selection!");
    return;
  }

  // mark request in-flight
  diffusion_inflight.value = true;

  // start polling progress
  let poll = { timeout: 0 };
  (async () => {
    progress.value = 0.0;
    await poll_progress();
    poll_rearm(poll);
  })();

  try {

    // capture is a data-uri, extract the base64 string
    let imgdata = image.value!.substring(22);

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

  upload();

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

// downloadlink for QR code
let downlink = ref<string>();

// upload the file to fileserver.py
async function upload() {

  // abort if there is no image
  if (diffusion.value === undefined) return;

  // create the data form
  let form = new FormData();
  let blob = await (await fetch(diffusion.value.src)).blob();
  form.append("file", blob);

  // post the file
  let up = await fetch("https://basecamp.informatik.uni-hamburg.de/diffusion/", {
    method: "POST",
    body: form,
  });

  // use the returned link
  if (!up.ok) { return console.error(up); }
  downlink.value = (await up.json()).link;

}

</script>

<template>

  <div id="pageroot">

    <!-- title and controlnets -->
    <div id="leftlane">

      <!-- glitchy title -->
      <div id="glitchytitle">
        <GlitchyTitle></GlitchyTitle>
      </div>

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
          <img src="/assets/controlnet/edges.png" ref="ctledges"><!-- <div id="leftside"> -->
          <div class="overlay"><span>soft edges</span></div>
        </div>
      </div>

    </div>

    <!-- center lane with selection controls -->
    <div id="midlane">

      <!-- picture capture controls -->
      <div id="capturecontrol">
        <div class="field">
          <label class="label">
            1. Capture Snapshot<br>
            <span style="font-size: smaller;">Or use the foot pedal!</span>
          </label>
          <div class="buttons">
            <button class="button is-medium is-danger" @click="clear_all" :disabled="(image == null && age == undefined && gender == undefined && preset == undefined)">Reset</button>
            <button class="button is-medium is-success" @click="take_snapshot"  v-if="image === null" :disabled="diffusion_inflight">Capture!</button>
            <button class="button is-medium is-warning" @click="clear_snapshot" v-if="image !== null" :disabled="diffusion_inflight">Retake</button>
            <!-- <button class="button is-medium is-info" @click="hallucinate" :disabled="diffusion_inflight || image == null || age == undefined || gender == undefined || preset == undefined">Diffusion</button> -->
            <!-- <button class="button is-medium is-info" @click="upload" v-if="image !== null">Upload</button> -->
          </div>
        </div>
      </div>

      <!-- character selection buttons -->
      <div id="characterselection">
        <div class="field"> <!-- character traits -->
          <label class="label" :class="{ 'has-text-danger': image !== null && (age === undefined || gender === undefined) }">
            2. Choose your Character
          </label>
          <div class="buttons has-addons">
            <button v-for="key in ages" :class="{ 'is-info': age == key }" class="button is-medium" @click="select_age(key)" :disabled="diffusion_inflight">{{ key }}</button>
          </div>
          <div class="buttons has-addons">
            <button v-for="key in genders" :class="{ 'is-info': gender == key }" class="button is-medium" @click="select_gender(key)" :disabled="diffusion_inflight">{{ key }}</button>
          </div>
        </div>
      </div>
  
      <!-- style presets -->
      <div id="styleselection">
        <div class="field">
          <label class="label" :class="{ 'has-text-danger': image !== null && preset === undefined }">
            3. Select Style: {{ preset !== undefined ? presets[preset].label : "NONE" }}
          </label>
          <div id="stylegrid">
            <figure v-for="(value, key) in presets" class="image container" :class="{ 'selected': preset === key }">
              <img @click="select_preset(key)" :title="value.label" :src="value.icon">
              <div class="overlay" @click="select_preset(key)">
                <span>{{ value.label }}</span>
              </div>
            </figure>
          </div>
        </div>
      </div>

    </div>

    <!-- qr code to take home -->
    <div id="rightlane">

      <div id="takehome" v-if="downlink !== undefined">
        <div class="field"> <!-- upload for QR code -->
          <label class="label">
            4. Take it Home!
          </label>
          <div class="qrcode">
            <qrcode :value="downlink" :size="200" level="L"/>
          </div>
        </div>
      </div>

    </div>

    <!-- video camera preview -->
    <div id="cameraimg" class="images">
      <div class="container framed">
        <video autoplay="true" ref="preview"></video>
        <img src="/assets/transparent.png" ref="snapshot">
      </div>
    </div>

    <!-- diffusion image -->
    <div id="diffusionimg" class="images">
      <div class="container framed">
        <img src="/assets/transparent.png" ref="diffusion">
        <progress class="progress is-small is-info" max="1" ref="progressbar" v-show="diffusion_inflight"></progress>
      </div>
    </div>
    
  </div>
  
</template>

<style scoped>

/* --------- OVERALL GRID LAYOUT --------- */

#pageroot {
  display: grid;
  column-gap: 2rem;
  align-content: space-between;
  justify-content: space-between;
  grid-template-columns: 1fr 23rem 1fr;
  grid-template-rows: auto;
  grid-template-areas:
    "leftlane  midlane  rightlane"
    "camera    midlane  diffusion";
}
#leftlane { grid-area: leftlane; }
#rightlane { grid-area: rightlane; }
#midlane { grid-area: midlane; }
#cameraimg { grid-area: camera; }
#diffusionimg { grid-area: diffusion; }

#leftlane, #rightlane {
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  justify-items: auto;
}

#cameraimg, #diffusionimg {
  align-self: end;
}

#midlane {
  align-content: space-between;
  /* align-self: end; */
  display: grid;
  grid-template-columns: 1fr;
  row-gap: 2rem;
}

#glitchytitle {
  padding-bottom: 1rem;
}

#takehome {
  justify-self: end;
  padding-right: 2rem;
}


/* --------- OVERLAY STYLING --------- */

.overlay, #cameraimg img {
  position: absolute;
  top: 0; bottom: 0;
  left: 0; right: 0;
  height: 100%;
  width: 100%;
}
.overlay {
  opacity: 0.0;
  transition: .2s ease;
  background-color: #fff9;
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
.container:hover .overlay {
  opacity: 1.0;
}


/* --------- ??? --------- */

.label {
  font-size: 1.4rem;
}

#characterselection button {
  width: 7.5rem;
  font-weight: bold;
}

#cameraimg video {
  transform: scaleX(-1);
}

progress {
  top: 0;
  position: absolute;
  scale: 1.05;
}

.qrcode {
  padding: 1rem;
  background: hsl(0, 0%, 100%);
  aspect-ratio: 1/1;
  width: calc(200px + 2rem);
}


/* --------- CONTROLNET IMAGES --------- */

#controlnets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  justify-items: center;
  column-gap: 1rem;
}

#controlnets img {
  height: 180px;
}

/* --------- FIT IMAGES IN FRAMES --------- */

.framed {
  background-color: rgb(104, 104, 104);
  border-radius: 1rem;
  border: solid 0.3rem white;
  overflow: hidden;
  aspect-ratio: 1/1;
}
#controlnets .framed {
  border: solid 0.2rem white;
}

.images video, .images img {
  height: 100%;
  object-fit: cover;
}


/* --------- STYLE SELECTION TILES --------- */

#stylegrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}
#stylegrid figure {
  width: 120px;
  padding: 0.6rem;
  cursor: pointer;
}
#stylegrid img {
  border-radius: 0.5rem;
  transition: 0.2s ease;
}
#stylegrid figure:hover, #stylegrid .selected {
  scale: 1.1;
  transition: 0.2s ease;
}
#stylegrid .selected img {
  outline: solid 0.3rem white;
}
#stylegrid figure:not(.selected):not(:hover) {
  opacity: 0.6;
}
#stylegrid .overlay {
  height: calc(100% - 1rem);
  width: calc(100% - 1rem);
  border-radius: 0.5rem;
  margin: 0.5rem;
}
#stylegrid .overlay span {
  font-size: 1.2rem;
  cursor: pointer;
}


</style>
