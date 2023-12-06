// This file contains functions to interact with the stable-diffusion-webui API,
// primarily through the `img2img` endpoint, to generate new pictures from a
// given reference image.

import type { Ages, Genders } from "@/characterselection";
import { chars } from "@/characterselection";

// TODO: use these (info) endpoints
// GET /controlnet/model_list
// GET /sdapi/v1/progress -- poll for spinner?
// POST /sdapi/v1/interrogate -- detect image description
// POST /rembg -- remove background
// http localhost:7860/sdapi/v1/loras | jq ".[] | .name"
// http localhost:7860/sdapi/v1/sd-models | jq ".[] | .title" -- get model names

// type alias for strings suitable for `<img>` elements
export type DataURI = string;

// enable and weight a controlnet
export type ControlNetOptions = {
  enabled: boolean;
  weight: number;
  control_mode?: "Balanced" | "My prompt is more important" | "ControlNet is more important";
}

// prompt data and generation options
export type DiffusionOptions = {

  // input image in base64
  image: string;

  // description of desired output
  prompt: string;
  negative_prompt?: string;

  // base model to use
  model: string;

  // enable controlnets
  control: {
    openpose: ControlNetOptions;
    depth: ControlNetOptions;
    softedge: ControlNetOptions;
  };

  // resolution, only squares for now
  resolution?: number;

  // seed, should be random (-1)
  seed?: number;

  // more advanced generation options
  denoising_strength?: number;
  cfg_scale?: number;
  steps?: number;
  n_iter?: number;
  batch_size?: number;
  sampler?: string;

}

// an img2img prompt to generate a new picture from a reference image
export async function diffusion(opt: DiffusionOptions): Promise<DataURI[]> {

  // simple "default value" function for optionals
  let use = <T>(val: T | undefined, def: T) => (val !== undefined) ? val : def;

  // assemble the POST request
  let request = await fetch("/sdapi/v1/img2img", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "accept": "application/json",
    },
    body: JSON.stringify({
      prompt: opt.prompt,
      negative_prompt: use(opt.negative_prompt, ""), // TODO: use preset
      init_images: [ opt.image ],
      seed: use(opt.seed, -1),
      steps: use(opt.steps, 20),
      width:  use(opt.resolution, 512),
      height: use(opt.resolution, 512),
      cfg_scale: use(opt.cfg_scale, 7),
      n_iter: use(opt.n_iter, 1),
      batch_size: use(opt.batch_size, 1),
      denoising_strength: use(opt.denoising_strength, 0.95),
      sampler_name: use(opt.sampler, "DPM++ 2M Karras"),
      override_settings: {
        sd_model_checkpoint: opt.model,
      },
      alwayson_scripts: {
        ControlNet: {
          args: [
            {
              module: "openpose_full",
              model: "control_v11p_sd15_openpose",
              enabled: opt.control.openpose.enabled,
              weight: opt.control.openpose.weight,
              control_mode: use(opt.control.openpose.control_mode, "Balanced"),
              processor_res : opt.resolution || 512,
              resize_mode : "Crop and Resize",
            },
            {
              module: "depth_midas",
              model: "control_v11f1p_sd15_depth",
              enabled: opt.control.depth.enabled,
              weight: opt.control.depth.weight,
              control_mode: use(opt.control.depth.control_mode, "Balanced"),
              processor_res : opt.resolution || 512,
              resize_mode : "Crop and Resize",
            },
            {
              module: "softedge_pidinet",
              model: "control_v11p_sd15_softedge",
              enabled: opt.control.softedge.enabled,
              weight: opt.control.softedge.weight,
              control_mode: use(opt.control.softedge.control_mode, "Balanced"),
              processor_res : opt.resolution || 512,
              resize_mode : "Crop and Resize",
            }
          ]
        },
      },
    })
  });

  // simple helper function to generate datauri for <img> elements from base64
  const datauri = (data: string) => `data:image/png;base64,${data}`;

  // parse the response
  let response = await request.json();
  console.debug("%c Response ", "background: #b7d1cb;", response.parameters);
  return (response.images as string[]).map(datauri);

};

// diffusion shorthand for pre-made styles
function dif(image: string, model: string, depth: number, pose: number, edges: number, prompt: string) {
  console.log("%c DIFFUSION prompt %c%s%c with %c%s", "background: lightgray", "background: yellowgreen", prompt,
    "background: lightgray", "background: lightblue", JSON.stringify({ model, depth, pose, edges }));
  return diffusion({ image, prompt, model, control: controlfn(depth, pose, edges) });
}


// create concise weight control object for hallucination function
// they should always be all enabled, to get previews
const f = (f: number) => f > 1.0 ? 1.0 : f < 0.0 ? 0.0 : f;
const controlfn = (depth: number, openpose: number, softedge: number) => ({
  depth:    { enabled: true, weight: f(depth)    },
  openpose: { enabled: true, weight: f(openpose) },
  softedge: { enabled: true, weight: f(softedge) },
});


// type of a style preset with icon path, hallucination function and character modifiers
export type Preset = {
  /** preview image for style selection */
  icon: string,
  /** label in user interface */
  label: string,
  /** hallucination function to be used from user interface */
  func: (image: string, gender: Genders, age: Ages) => Promise<DataURI[]>,
}

// ! stable-diffusion models
//  absolutereality181.n8IR.safetensors [463d6a9fe8]
//  animepasteldreamSoft.lTTK.safetensors [4be38c1a17]
//  caricaturizer_pcrc_style.uwgn1lmj.q5b.ckpt
//  clazy2600.xYzn.ckpt [ed2cf308d1]
//  dreamshaper8Pruned.hz5Q.safetensors [879db523c3]
//  dreamshaper_332BakedVaeClipFix.ckpt [637d5dcb91]
//  v1-5-pruned-emaonly.safetensors [6ce0161689]
//  westernanidiffusion.EpVW.safetensors [d20bc9d543]


// ! lora names
//  "ClayAnimationRedmond15-ClayAnimation-Clay"
//  "coolkidsMERGEV25.Qqci"
//  "gotchaV001.Yu4Z"
//  "modillPASTELRCV001.xsmb"
//  "neotokioV001.yBGi"
//  "stylizardV1.mPLw"
//  "watercolorv1.7lox"


export const presets = {

  // free: { // hallucinate freely with no style constraints
  //   icon: "/assets/style/free.png",
  //   label: "Freely Hallucinate",
  //   func: (image, gender, age) => dif(image, "dreamshaper8Pruned.hz5Q.safetensors", 0.6, 0.5, 0.2,
  //     chars.homosapiens(gender, age)),
  // } as Preset,

  clay: { // clay or plastic figures
    icon: "/assets/style/clay.png",
    label: "Clay Figure",
    func: (image, gender, age) => dif(image, "clazy2600.xYzn.ckpt", 0.7, 0.8, 0.4,
      `clazy style, claymation, stopmotion, small clay figure of a ${chars.persons(gender, age)}, vibrant colors, fantastic plastic <lora:ClayAnimationRedmond15-ClayAnimation-Clay:0.7>`),
  } as Preset,

  gotcha: { // heavily stylized illustrations
    icon: "/assets/style/gotcha.png",
    label: "Gotcha!",
    func: (image, gender, age) => dif(image, "dreamshaper8Pruned.hz5Q.safetensors", 0.5, 0.5, 0.4,
      `stylized cartoon, illustration, portrait of ${chars.healthyboy(gender, age)} and an animal, looking sideways, forest in the background <lora:gotchaV001.Yu4Z:0.4>`),
  } as Preset,

  // impasto: { // impasto oil painting
  //   icon: "/assets/style/impasto.png",
  //   label: "Impasto Painting",
  //   func: (image, gender, age) => dif(image, "dreamshaper8Pruned.hz5Q.safetensors", 0.6, 0.6, 0.3,
  //     `((impasto)), intricate oil painting, thick textured paint, artistic, old holland classic colors, portrait of a ${chars.persons(gender, age)}, looking to the front`),
  // } as Preset,

  kids: { // delightful kids' illustration
    icon: "/assets/style/kids.png",
    label: "Kids' Illustration",
    func: (image, gender, age) => dif(image, "dreamshaper8Pruned.hz5Q.safetensors", 0.7, 0.9, 0.4,
      `kids illustration, children's cartoon, happy ${chars.healthyboy(gender, age)}, looking at the camera, kitchen in the background <lora:coolkidsMERGEV25.Qqci:1>`),
  } as Preset,

  marble: { // marble sculpture in a museum
    icon: "/assets/style/marble.png",
    label: "Marble Sculpture",
    func: (image, gender, age) => dif(image, "absolutereality181.n8IR.safetensors", 0.5, 1.0, 0.4,
      `marble sculpture in a museum, bust of ${chars.persons(gender, age)}, greek hills, art gallery in the background, realistic photo`),
  } as Preset,

  pencil: { // rough pencil drawing
    icon: "/assets/style/pencil.png",
    label: "Pencil Sketch",
    func: (image, gender, age) => dif(image, "absolutereality181.n8IR.safetensors", 0.8, 0.8, 0.3,
      `very rough pencil sketch, ${chars.persons(gender, age)}, black-and white, hand-drawn, scribble`),
  } as Preset,

  retro: { // stylized illustration with blocky colors
    icon: "/assets/style/retro.png",
    label: "Retro Stylized",
    func: (image, gender, age) => dif(image, "dreamshaper8Pruned.hz5Q.safetensors", 0.8, 0.6, 0.4,
      `stylized retro illustration, low palette, pastel colors, sharp lines, band album cover, ${chars.persons(gender, age)}`),
  } as Preset,

  scifi: { // futuristic sci-fi scene
    icon: "/assets/style/scifi.png",
    label: "Sci-Fi",
    func: (image, gender, age) => dif(image, "absolutereality181.n8IR.safetensors", 1.0, 0.8, 0.6,
      `futuristic sci-fi movie, ${chars.persons(gender, age)}, neon lights illumination, distant night city in the background`),
  } as Preset,

  western: { // western comics (i.e. superman)
    icon: "/assets/style/western.png",
    label: "Western Comic",
    func: (image, gender, age) => dif(image, "westernanidiffusion.EpVW.safetensors", 0.7, 0.8, 0.4,
      `western comic, portrait, ${chars.randomhero(gender, age)}, looking to the side, metropolis in the background`)
  } as Preset,

  anime: { // anime movie screencap
    icon: "/assets/style/anime.png",
    label: "Anime",
    func: (image, gender, age) => dif(image, "animepasteldreamSoft.lTTK.safetensors", 0.9, 1.0, 0.6,
      `anime illustration, movie still, ${chars.anime(gender, age)}, smiling and happy, looking sideways, bright sun, summer, small town in the background`),
  } as Preset,

  medieval: { // horrible medieval painting
    icon: "/assets/style/impasto.png",
    label: "Medieval Painting",
    func: (image, gender, age) => dif(image, "dreamshaper8Pruned.hz5Q.safetensors", 0.4, 0.6, 0.2,
      `bad mediaval painting, framed, textured paint, scene with a ${chars.persons(gender, age)}, stabbing king`),
  } as Preset,

  astronaut: { // photograph of an astronaut
    icon: "/assets/style/astronaut.png",
    label: "Astronaut",
    func: (image, gender, age) => dif(image, "absolutereality181.n8IR.safetensors", 0.6, 0.9, 0.4,
      `portrait of ${chars.homosapiens(gender, age)} NASA astronaut in spacesuit before rocket launch, space photography in the background, realistic photo, shot on DSLR`),
  } as Preset,

  caricature: { // heavily caricaturized drawing
    icon: "/assets/style/caricature.png",
    label: "Caricaturized",
    func: (image, gender, age) => dif(image, "caricaturizer_pcrc_style.uwgn1lmj.q5b.ckpt", 0.6, 0.4, 0.1,
      `caricature, hand-drawn illustration, portrait of a ${chars.persons(gender, age)}, looking sideways`),
  } as Preset,

  neotokyo: { // style of dark 90s anime
    icon: "/assets/style/neotokyo.png",
    label: "NEOTOKIO",
    func: (image, gender, age) => dif(image, "dreamshaper8Pruned.hz5Q.safetensors", 1.0, 0.8, 0.4,
      `neotokio, 90s anime, ${chars.persons(gender, age)}, looking at the camera, portrait, evening, narrow alley in the background, bright neon signs <lora:NEOTOKIO_V0.01:0.7>`),
  } as Preset,

  vaporwave: { // very colorful vibrant vaporwave illustration
    icon: "/assets/style/vaporwave.png",
    label: "Vaporwave",
    func: (image, gender, age) => dif(image, "dreamshaper8Pruned.hz5Q.safetensors", 1.0, 0.8, 0.6,
      `vaporwave, illustration, vibrant colors, neon background, flying hair, ${chars.persons(gender, age)}`),
  } as Preset,

  watercolor: { // watercolor painting
    icon: "/assets/style/watercolor.png",
    label: "Watercolor",
    func: (image, gender, age) => dif(image, "dreamshaper8Pruned.hz5Q.safetensors", 0.8, 0.9, 0.4,
      `watercolor painting, hand-drawn illustration, portrait of a ${chars.persons(gender, age)}, looking sideways, clear white paper background <lora:watercolorv1.7lox:1>`),
  } as Preset,

}

export type Presets = keyof typeof presets;