<script setup lang="ts">
import { ref, onMounted } from "vue";
import { presets } from "@/stablediffusion";
import GlitchyTitle from "@/GlitchyTitle.vue";

// invisible video stream for camera capture
const camera = document.createElement("video");
camera.autoplay = true;

// style selection
// let style = ref<HTMLSelectElement>();

// capture preview element
let preview = ref<HTMLImageElement>();

// generated image element
let diffusion = ref<HTMLImageElement>();

// controlnet previews
let ctlpose = ref<HTMLImageElement>();
let ctldepth = ref<HTMLImageElement>();
let ctledges = ref<HTMLImageElement>();


onMounted(async () => {

  // start the video stream
  let stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  // let vid = camera.value!;
  camera.srcObject = stream;
  // vid.play();

  // automatically capture on load
  camera.addEventListener("canplay", async () => {
    await capture();
  }, { once: true });

});

// capture a still image from camera feed
async function capture() {

  // get the height from video for square
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
  preview.value!.src = canvas.toDataURL();

}

// get available preset functions
const presetOptions = Object.keys(presets);

// send capture to stable-diffusion for transformation
async function hallucinate() {

  // capture is a data-uri, extract the base64 string
  let imgdata = preview.value!.src.substring(22);

  let output: string[];
  // let preset = style.value!.value as keyof typeof presets;
  let preset: keyof typeof presets = style.value;
  if (!Object.keys(presets).includes(preset)) return;
  output = await presets[preset](imgdata);

  // set generated image and controlnet previews
  diffusion.value!.src = output[0];
  ctlpose.value!.src  = output[1];
  ctldepth.value!.src = output[2];
  ctledges.value!.src = output[3];

}

const genders = [ "Person", "Male", "Female" ] as const;
let gender = ref<typeof genders[number]>("Person");

const ages = [ "Young", "Middle", "Old" ] as const;
let age = ref<typeof ages[number]>("Young");

const styles: { [s in keyof typeof presets]: string } = {
  clay: "Clay Figure",
  free: "Freely Hallucinate",
  gotcha: "Gotcha!",
  impasto: "Impasto Painting",
  kids: "Kids' Illustration",
  marble: "Marble Sculpture",
  pencil: "Pencil Sketch",
  retro: "Retro Stylized",
  scifi: "Sci-Fi",
  western: "Western Comic",
  anime: "Anime",
  astronaut: "Astronaut",
  caricature: "Caricaturized",
  neotokyo: "NEOTOKIO",
  vaporwave: "Vaporwave",
  watercolor: "Watercolor",
}
let style = ref<keyof typeof styles>("anime");


</script>

<template>

  <GlitchyTitle></GlitchyTitle>
  <div class="tile is-ancestor controls">

    <!-- left side: title and capture -->
    <div class="tile is-child">

      <div class="field">
        <label class="label">Character Selection</label>
        <div class="buttons has-addons">
          <button v-for="key in ages" :class="{ 'is-success': age == key }" class="button is-medium" @click="age = key">{{ key }}</button>
        </div>
        <div class="buttons has-addons">
          <button v-for="key in genders" :class="{ 'is-link': gender == key }" class="button is-medium" @click="gender = key">{{ key }}</button>
        </div>
      </div>

      <!-- TODO -->
      <!-- <div class="field">
        <label class="label">Expression</label>
        <div class="buttons has-addons">
          <button v-for="key in expressions" :class="{ 'is-warning': expression === key }" class="button is-medium" @click="expression = key">{{ key }}</button>
        </div>
      </div> -->


    </div>
    <!-- / left side -->


    <!-- right side: hallucinations -->
    <div class="tile is-child">

      <!-- style selection -->
      <!-- <div class="field">
        <label class="label">Style Preset</label>
        <div class="control">
          <div class="select">
            <select ref="style">
              <option v-for="p in presetOptions">{{ p }}</option>
            </select>
          </div>
        </div>
      </div> -->

      <div class="field">
        <label class="label">Style Selection: {{ styles[style] }}</label>
        <div class="stylegrid">
          <figure v-for="(value, key) in styles" class="image is-96x96">
            <img :class="{ 'selected': style === key }" @click="style = key" :title="value" :src="`/assets/style/${key}.png`">
          </figure>
        </div>
      </div>

    </div>
    <!-- / right side -->

  </div>


  <div class="tile is-ancestor images">

    <div class="tile is-child is-5 capture">
      <!-- captured image -->
      <img @click="capture" title="New Capture" src="/assets/transparent.png" ref="preview">
    </div>

    <div class="tile is-child is-7 diffusion">
      <!-- hallucinated image -->
      <!-- TODO: disable click when in progress -->
      <img @click="hallucinate" title="Run Diffusion" src="/assets/transparent.png" ref="diffusion">
      <div class="controlnets">
        <!-- three small for controlnet display -->
        <img src="/assets/controlnet/pose.png"  ref="ctlpose">
        <img src="/assets/controlnet/depth.png" ref="ctldepth">
        <img src="/assets/controlnet/edges.png" ref="ctledges">
      </div>
    </div>

  </div>

</template>

<style scoped>

.images {
  position: absolute;
  bottom: 2rem;
  width: 100%;
}
.images img {
  height: 512px;
  background-color: rgb(104, 104, 104);
  border-radius: 1rem;
  border: solid 0.3rem white;
  aspect-ratio: 1/1;
  margin: 0 auto;
  display: block;
  transition: all ease 0.2s;
}

.images img:hover {
  scale: 1.03;
}

.images .capture img:hover {
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
