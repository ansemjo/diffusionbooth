// This is code to select your generated character, i.e. male/female and age
// and produce prompt keywords for each style.

// select a gender
export const genders = [ "Female", "Person", "Male" ] as const;
export type Genders = typeof genders[number];

// select an age
export const ages = [ "Young", "Middle", "Old" ] as const;
export type Ages = typeof ages[number];

// combine both to select a suitable prompt
export type Characterizer = (gender: Genders, age: Ages) => string;
/** matrix with preset strings, used as `matrix[gender][age]`, i.e. `[[ "young girl", "woman", "grandmother" ], ... ]` */
export type CharacterMatrix = [[ string, string, string ], [ string, string, string ], [ string, string, string ]];
export function characterbuilder(mat: CharacterMatrix): Characterizer {
  return (gender, age) => {
    let char = mat[genders.indexOf(gender)][ages.indexOf(age)];
    console.debug(`Selection (${age}, ${gender}) is '${char}'`);
    return char;
  };
};

// a few pre-made characterizers
export const chars = {

  healthyboy: characterbuilder([
    [ "young girl", "mother", "grandmother" ],
    [ "young kid", "adult", "grandparent" ],
    [ "young boy", "father", "grandfather" ],
  ]),
  
  persons: characterbuilder([
    [ "young girl", "woman", "old woman" ],
    [ "young person", "person", "old person" ],
    [ "young boy", "man", "old man" ],
  ]),
  
  homosapiens: characterbuilder([
    [ "young female", "female", "old female" ],
    [ "young person", "person", "old person" ],
    [ "young male", "male", "old male" ],
  ]),
  
  anime: characterbuilder([
    [ "1girl", "1woman", "old 1woman grandmother" ],
    [ "kid", "person", "grandparent" ],
    [ "1boy", "1man", "old 1man grandfather" ],
  ]),

  superman: characterbuilder([ // superman
  [ "young supergirl", "supergirl", "old supergirl" ],
    [ "young person in superman costume", "person in superman costume", "old person in superman costume"],
    [ "young superman", "superman", "old superman" ],
  ]),
  batman: characterbuilder([ // batman
  [ "young batgirl", "batgirl", "old batgirl" ],
    [ "young person in batman costume", "person in batman costume", "old person in batman costume" ],
    [ "young batman", "batman", "old batman" ],
  ]),
  joker: characterbuilder([ // the joker
  [ "young female joker villain", "female joker villain", "old female joker villain" ],
    [ "young person as the joker villain", "person as the joker villain", "old person as the joker villain" ],
    [ "young joker villain", "joker villain", "old joker villain" ],
  ]),
  hulk: characterbuilder([ // hulk
  [ "young she-hulk", "she-hulk", "old she-hulk" ],
    [ "young hulk person", "hulk person", "old hulk person" ],
    [ "young hulk", "hulk", "old hulk" ],
  ]),
  witch: characterbuilder([ // scarlet witch x doctor strange
  [ "young scarlet witch", "scarlet witch", "old scarlet witch" ],
    [ "young sorcerer or witch person", "sorcerer or witch person", "old sorcerer or witch person" ],
    [ "young doctor strange", "doctor strange", "old doctor strange" ],
  ]),

  // random hero
  randomhero: (gender: Genders, age: Ages) => {
    let heroes = [ chars.superman, chars.batman, chars.joker, chars.hulk, chars.witch ];
    return heroes[crypto.getRandomValues(new Uint32Array(1))[0] % heroes.length](gender, age);
  },

};