# AI PhotoBooth

First, some general notes:

* There's Models, Refiners, [ControlNets](https://huggingface.co/lllyasviel/ControlNet-v1-1/tree/main), LoRas, Extras, ... all of these need to be compatible to one another! While the SDXL models look really great and 1024x1024 images are significantly sharper, the GPUs on `basegpu1` simply don't have enough memory. I could only use these models on my laptop when using CPU offloading, because I have enough RAM; and even then I used something north of 20 GB. So stick to SD1.5 for now; most available addon models also use this as a base.
  * **Models** and refiners are the *base* of the image generation. Refiners add more detail. There seem to be actual technical differences, as the remaining models need to be compatible. The base model can influence the output to some extent, so pick "DreamShaper" for artistic and "RealisticVision" for photographic output.
  * **ControlNets** detect features in the original image and add constraints to the output, like depth field, pose and face expression or general features via edge detection. Often these work best in this combination. But tone down the canny model a bit to avoid artifacts due to bad photos. A good explanation of each is found in the [GitHub repo](https://github.com/lllyasviel/ControlNet-v1-1-nightly), [this guide](https://stable-diffusion-art.com/controlnet/) and [YouTube video](https://www.youtube.com/watch?v=mmZSOBSg2E4).
  * **LoRas** are still new to me and I'm not sure at what stage exactly they come into play .. but they can *heavily* influence the output of the model! For example, I like the NeoTokyo LoRa a lot. I had rather bad results with the Claymation model but the images on Reddit look amazing.
* Workflow-wise it's easier to use the `img2img` tab and bump up the noise to basically remove almost all of the original image. This way, all the ControlNets automatically use the same input image for detection.
* *Of course*, there's a [ready product](https://snapbar.com/snapshot/ai-photo-booth) of this concept already. But we're not interested in using that directly. Their gallery is a nice reference for some template styles though.
* In extreme cases you could use the `rembg` extra to remove background from an image first. This doesn't always work cleanly either and I have not quite figured out how to hallucinate a nice background instead of boring white. But it's certainly easier than trying to use the sketch brush.
* Check [r/StableDiffusion](https://old.reddit.com/r/StableDiffusion/) for lots of inspiration and nice models.

| Extensions                               | URL                                                          |
| ---------------------------------------- | ------------------------------------------------------------ |
| ControlNets                              | https://github.com/Mikubill/sd-webui-controlnet.git          |
| Refiner<br />Not really needed for SD1.5 | https://github.com/wcde/sd-webui-refiner.git                 |
| Remove Background in Extras              | https://github.com/AUTOMATIC1111/stable-diffusion-webui-rembg |
| Show JSON Payload                        | https://github.com/huchenlei/sd-webui-api-payload-display    |

| Models           | URL                                                          |
| ---------------- | ------------------------------------------------------------ |
| DreamShaper      | https://civitai.com/models/4384/dreamshaper                  |
| WesternAnimation | https://civitai.com/models/86546/western-animation-diffusion |
| AnimePastel      | https://civitai.com/models/23521/anime-pastel-dream          |
| AbsoluteReality  | https://civitai.com/models/81458/absolutereality             |
| **ControlNets**  |                                                              |
| ControlNet v1.1  | https://huggingface.co/lllyasviel/ControlNet-v1-1/tree/main  |
|                  | use depth, softedge and openpose, maybe reference?           |
| **LoRa**         |                                                              |
| ClayAnimation    | https://huggingface.co/artificialguybr/clayanimationredmond-1-5-version-clay-animation-lora-for-sd-1-5<br />token "Clay Animation, claymation" |
| ModillPastell    | https://civitai.com/models/103158?modelVersionId=110428<br />token "whimsical", use 0.3 on dreamshaper, up to 0.6 on realistic |
| NEOTOKIO         | https://civitai.com/models/78374<br />token like "neotokio, 90s anime", use 0.7 .. 1.0 |
| Gotcha!          | https://civitai.com/models/76408?modelVersionId=81183<br />only use 0.4! |
| KIDS             | https://civitai.com/models/60724/kids-illustration<br />"kids illustration, cartoon" |
| Watercolor       | https://civitai.com/models/64560/watercolor<br />"watercolor painting" |
| Stylizard        | https://civitai.com/models/189726/stylizard-3d-stylized-character-prototyping<br />"3D, stylized character", weight 0.7 .. 1.2, CFG 7 .. 12, probably no edges |

You **should enable larger cache** for ControlNet models! Otherwise they need to be reloaded for every API call, which takes unecessarily long time.

* [Go to Settings > ControlNet (left) > increase "Model cache size"](https://github.com/Mikubill/sd-webui-controlnet/issues/429#issuecomment-1449200295)

## Keywords / Hints

* As much as I'd like to not dip into the whole gender debate ... even a rather clearly male input image can result in feminine looking output if you just use a generic term like "person". So maybe give a choice of "male / female / person"?
* Avoid artifacts in the base image! Maybe take off your glasses. Check for bright spots and reflections. Too much "softedge" control may transfer more artifacts but also generally produces closer-looking persons.
* Put *emotions* in the prompt! Just putting in "happy male" with the KIDS LoRa had a really drastic effect on facial expression!
* Use negative prompts for things the AI likes to do: "open mouth" and weird "beard".

## User Interface

* **Should be DIY**; I don't want to sit there all evening.
* **Process:**
  1. Take a photo with short self-timer; don't ever show the true photo?
     This generates a unique directory for the output
  2. Select style, settings and keywords; maybe a pre-made background to insert into
  3. Click "GENERATE" (multiple times?)
  4. View the generated pictures with a QR Code on local server
     What kind of WiFi network do we have?
* **Choices:**
  * **Style:** the overall style, i.e. "Anime", "Kids Cartoon", "Watercolor", "Vaporwave", ... this sets a template of settings such as model and LoRa
  * **Character:** choose your output gender, age, facial expression
  * ~~**Keywords:** pick from a selection of pre-made phrases like "on fire", ...~~ (determined by style)
  * **Controls:** toggle controlnets (with visual explanation) for OpenPose, Depth and SoftEdges
  * **Background:** fix the problem of boring backgrounds by selecting a pre-made one and placing humans on it with `rembg` extra as pipeline step

## Styles

Each combination of style and LoRa requires some specific keywords and settings, so I should collect those and build some templates here.

#### NeoTokio

Model: use DreamShaper + NEOTOKIO

> `neotokyo, 90s anime, drawing of a young man, portrait <lora:NEOTOKIO_V0.01:1>`
> CFG scale: 7, Model: dreamshaper8Pruned.hz5Q,  Denoising strength: 0.95
> ControlNet 0: "Module: openpose_full, Model:  control_v11p_sd15_openpose [cab727d4], Weight: 0.8, Control Mode: Balanced"
> ControlNet 1: "Module: depth_zoe, Model:  control_v11f1p_sd15_depth [cfd03158], Weight: 1, Control Mode: Balanced"
> ControlNet 2: "Module: softedge_pidinet, Model:  control_v11p_sd15_softedge [a8575a2a], Weight: 0.5, Control Mode: Balanced"
> Lora hashes: "NEOTOKIO_V0.01: c4c6ad6be466"

#### KIDS Cartoon

Use DreamShaper + CoolKIDS

`kids illustration, children's cartoon, close-up, happy boy, looking sideways, kitchen in the background <lora:coolkidsMERGEV25.Qqci:1>`

#### Western Comic

Use Western model without any LoRa

`western comic, portrait, superman, close-up, looking sideways, skyscrapers in the background`, could probably replace the superhero

#### Gotcha!

Heavily stylized illustrations; use DreamShaper + Gotcha:0.4

Tone down the ControlNets *a lot* to give the LoRa space to hallucinate! Cross-breeding with completely non-human looking animals doesn't work well anyway, though. So no frogs please.

`stylized cartoon, illustration, portrait of a monkey, looking sideways, forest in the background <lora:gotchaV001.Yu4Z:0.4>`

#### Watercolor

Use DreamShaper + Watercolor LoRa; works rather simple, but maybe it's worth it to specify "vibrant colors"; can use ControlNets very well

`watercolor painting, hand-drawn illustration, portrait of a young man, looking sideways, clear white paper background <lora:watercolorv1.7lox:1>`

#### Astronaut

Use the AbsoluteReality model, no LoRa; can use high edges control here!

`portrait of a male NASA astronaut in spacesuit before rocket launch, space photography in the background, realistic photo, shot on DSLR`

#### Marble Sculpture

AbsoluteReality again, no LoRa; maybe specify -naked etc.; they all look so serious!

`marble sculpture in a museum, bust of a male, art gallery in the background, realistic photo`

#### Anime

Use specialized AnimePastelDream model without LoRa; tone down the Controls *hard* to give the model more space to hallucinate!

`anime illustration, 1boy, smiling and happy, looking sideways, bright sun, summer, small town in the background`

#### Retro + Stylized Album Cover

Use DreamShaper again, no LoRa; oops, specify gender!

`stylized retro illustration, low palette, pastel colors, band album cover`

#### Pencil Drawing

DreamShaper, no LoRa

`rough sketch, pencil drawing of a young male, black-and white, stylized illustration, hand-drawn`

#### Clay / Plastic Figure

DreamShaper + ClayRedmond LoRa; careful, this *can* be nightmare fuel very quickly!

`stopmotion, claymation, small clay figure of a young male, vibrant colors, fantastic plastic <lora:ClayAnimationRedmond15-ClayAnimation-Clay:1>`

.. ooooor: Clazy model without LoRa; must use "clazy style" in prompt, otherwise the result is *abhorrent*. Works a lot better as a 50% refiner! And maybe I should disable edges and depth controls for this.

`clazy style, stopmotion, claymation, small clay figure of a young male, vibrant colors, fantastic plastic`
