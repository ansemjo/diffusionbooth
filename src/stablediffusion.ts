// This file contains functions to interact with the stable-diffusion-webui API,
// primarily through the `img2img` endpoint, to generate new pictures from a
// given reference image.

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
export type HallucinationOptions = {

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
export async function hallucinate(opt: HallucinationOptions): Promise<DataURI[]> {

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
  console.debug("HALLUCINATED", response.parameters);
  return (response.images as string[]).map(datauri);

};


export const presets = {

  // ! stable-diffusion models
  // absolutereality181.n8IR.safetensors [463d6a9fe8]
  // animepasteldreamSoft.lTTK.safetensors [4be38c1a17]
  // caricaturizer_pcrc_style.uwgn1lmj.q5b.ckpt
  // clazy2600.xYzn.ckpt [ed2cf308d1]
  // dreamshaper8Pruned.hz5Q.safetensors [879db523c3]
  // dreamshaper_332BakedVaeClipFix.ckpt [637d5dcb91]
  // v1-5-pruned-emaonly.safetensors [6ce0161689]
  // westernanidiffusion.EpVW.safetensors [d20bc9d543]


  // ! lora names
  // "ClayAnimationRedmond15-ClayAnimation-Clay"
  // "coolkidsMERGEV25.Qqci"
  // "gotchaV001.Yu4Z"
  // "modillPASTELRCV001.xsmb"
  // "neotokioV001.yBGi"
  // "stylizardV1.mPLw"
  // "watercolorv1.7lox"

  // TODO: replace "young man" etc. with selected gender / age / etc.

  // hallucinate with no style constraints
  "free": (data: string) => hallucinate({
    image: data,
    prompt: "",
    model: "dreamshaper8Pruned.hz5Q.safetensors",
    control: {
      depth: { enabled: true, weight: 0.6 },
      openpose: { enabled: true, weight: 0.5 },
      softedge: { enabled: true, weight: 0.2 },
    },
  }),

  // style of 90s anime
  "neotokyo": (data: string) => hallucinate({
    image: data,
    prompt: "neotokio, 90s anime, young man with glasses, looking at the camera, portrait, evening, narrow alley in the background, bright neon signs <lora:NEOTOKIO_V0.01:0.7>",
    model: "dreamshaper8Pruned.hz5Q.safetensors",
    control: {
      depth: { enabled: true, weight: 1.0 },
      openpose: { enabled: true, weight: 0.8 },
      softedge: { enabled: true, weight: 0.4 },
    },
  }),

  // kids' illustrations
  "kids": (data: string) => hallucinate({
    image: data,
    prompt: "kids illustration, children's cartoon, happy boy, looking at the camera, kitchen in the background <lora:coolkidsMERGEV25.Qqci:1>",
    model: "dreamshaper8Pruned.hz5Q.safetensors",
    control: {
      depth: { enabled: true, weight: 0.7 },
      openpose: { enabled: true, weight: 0.8 },
      softedge: { enabled: true, weight: 0.4 },
    },
  }),

  // western comics (i.e. superman)
  "western": (data: string) => hallucinate({
    image: data,
    prompt: "western comic, portrait, superman, looking to the side, city with skyscrapers in the background",
    model: "westernanidiffusion.EpVW.safetensors",
    control: {
      depth: { enabled: true, weight: 0.7 },
      openpose: { enabled: true, weight: 0.8 },
      softedge: { enabled: true, weight: 0.4 },
    },
  }),

  // heavily stylized illustrations
  "gotcha": (data: string) => hallucinate({
    image: data,
    prompt: "stylized cartoon, illustration, portrait of an animal, looking sideways, forest in the background <lora:gotchaV001.Yu4Z:0.4>",
    model: "dreamshaper8Pruned.hz5Q.safetensors",
    control: {
      depth: { enabled: true, weight: 0.5 },
      openpose: { enabled: true, weight: 0.2 },
      softedge: { enabled: true, weight: 0.1 },
    },
  }),

  // watercolor painting
  "watercolor": (data: string) => hallucinate({
    image: data,
    prompt: "watercolor painting, hand-drawn illustration, portrait of a young man, looking sideways, clear white paper background <lora:watercolorv1.7lox:1>",
    model: "dreamshaper8Pruned.hz5Q.safetensors",
    control: {
      depth: { enabled: true, weight: 0.7 },
      openpose: { enabled: true, weight: 0.8 },
      softedge: { enabled: true, weight: 0.4 },
    },
  }),

  // photograph of an astronaut
  "astronaut": (data: string) => hallucinate({
    image: data,
    prompt: "portrait of a male NASA astronaut in a spacesuit before rocket launch, space photography in the background, realistic photo, shot on DSLR",
    model: "absolutereality181.n8IR.safetensors",
    control: {
      depth: { enabled: true, weight: 0.4 },
      openpose: { enabled: true, weight: 0.8 },
      softedge: { enabled: true, weight: 0.4 },
    },
  }),

  // marble sculpture in a museum
  "marble": (data: string) => hallucinate({
    image: data,
    prompt: "marble sculpture in a museum, bust of a male, greek hills, art gallery in the background, realistic photo",
    model: "absolutereality181.n8IR.safetensors",
    control: {
      depth: { enabled: true, weight: 0.5 },
      openpose: { enabled: true, weight: 1.0 },
      softedge: { enabled: true, weight: 0.4 },
    },
  }),

  // anime movie screencap
  "anime": (data: string) => hallucinate({
    image: data,
    prompt: "anime illustration, movie still, 1boy, smiling and happy, looking sideways, bright sun, summer, small town in the background",
    model: "animepasteldreamSoft.lTTK.safetensors",
    control: {
      depth: { enabled: true, weight: 1.0 },
      openpose: { enabled: true, weight: 0.8 },
      softedge: { enabled: true, weight: 0.6 },
    },
  }),

  // stylized illustration with blocky colors
  "retro": (data: string) => hallucinate({
    image: data,
    prompt: "stylized retro illustration, low palette, pastel colors, sharp lines, band album cover",
    model: "dreamshaper8Pruned.hz5Q.safetensors",
    control: {
      depth: { enabled: true, weight: 0.8 },
      openpose: { enabled: true, weight: 0.4 },
      softedge: { enabled: true, weight: 0.4 },
    },
  }),

  // rough pencil drawing
  "pencil": (data: string) => hallucinate({
    image: data,
    prompt: "very rough sketch, pencil drawing, a young male, black-and white, hand-drawn, scribble",
    model: "dreamshaper8Pruned.hz5Q.safetensors",
    control: {
      depth: { enabled: true, weight: 0.8 },
      openpose: { enabled: true, weight: 0.8 },
      softedge: { enabled: true, weight: 0.6 },
    },
  }),

  // clay or plastic figures
  "clay": (data: string) => hallucinate({
    image: data,
    prompt: "clazy style, claymation, stopmotion, small clay figure of a young male, vibrant colors, fantastic plastic <lora:ClayAnimationRedmond15-ClayAnimation-Clay:1>",
    model: "clazy2600.xYzn.ckpt",
    control: {
      depth: { enabled: true, weight: 0.7 },
      openpose: { enabled: true, weight: 0.8 },
      softedge: { enabled: true, weight: 0.4 },
    },
  }),

  // very colorful vibrant vaporwave illustration
  "vaporwave": (data: string) => hallucinate({
    image: data,
    prompt: "vaporwave, illustration, vibrant colors, neon background, purple, flying hair, smiling young male",
    model: "dreamshaper8Pruned.hz5Q.safetensors",
    control: {
      depth: { enabled: true, weight: 1.0 },
      openpose: { enabled: true, weight: 0.8 },
      softedge: { enabled: true, weight: 0.6 },
    },
  }),

  // futuristic sci-fi scene
  "scifi": (data: string) => hallucinate({
    image: data,
    prompt: "futuristic sci-fi, neon lights illumination, distant night city in the background",
    model: "dreamshaper8Pruned.hz5Q.safetensors",
    control: {
      depth: { enabled: true, weight: 1.0 },
      openpose: { enabled: true, weight: 0.8 },
      softedge: { enabled: true, weight: 0.6 },
    },
  }),

  // heavily caricaturized drawing
  "caricature": (data: string) => hallucinate({
    image: data,
    prompt: "caricature, hand-drawn illustration, portrait of a young man, looking sideways",
    model: "caricaturizer_pcrc_style.uwgn1lmj.q5b.ckpt",
    control: {
      depth: { enabled: true, weight: 0.6 },
      openpose: { enabled: true, weight: 0.3 },
      softedge: { enabled: false, weight: 0.0 },
    },
  }),

  // heavily caricaturized drawing
  "impasto": (data: string) => hallucinate({
    image: data,
    prompt: "((impasto)), intricate oil painting, thick textured paint, artistic, old holland classic colors, portrait of a young man, looking to the front",
    model: "dreamshaper8Pruned.hz5Q.safetensors",
    control: {
      depth: { enabled: true, weight: 0.6 },
      openpose: { enabled: true, weight: 0.5 },
      softedge: { enabled: true, weight: 0.8 },
    },
  }),

}