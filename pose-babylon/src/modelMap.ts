import { Vector3 } from "@babylonjs/core";
import { OutfitParams } from "@geenee/bodyrenderers-common";
export const outfitMap: {
    [key: string]: {
        file: string, avatar: boolean,
        outfit?: OutfitParams
    }
} = {
    polo: {
        file: "./Models/polo.glb", avatar: false,
        outfit: {
            occluders: [/Head$/, /Body/, /Bottom/],
            hidden: [/Eye/, /Teeth/, /Footwear/, /Glasses/]
        }
    },
    tee: {
        file: "./Models/tee.glb", avatar: false,
        outfit: {
            occluders: [/Head$/, /Body/, /Bottom/],
            hidden: [/Eye/, /Teeth/, /Footwear/, /Glasses/]
        }
    },
    quarter: {
        file: "./Models/quarter.glb", avatar: false,
        outfit: {
            occluders: [/Head$/, /Body/, /Bottom/],
            hidden: [/Eye/, /Teeth/, /Footwear/, /Glasses/]
        }
    },    
    onesie: {
        file: "./Models/onesie.glb", avatar: false,
        outfit: {
            occluders: [/Head$/, /Body/],
            hidden: [/Eye/, /Teeth/, /Glasses/]
        }
    },
    jacket: {
        file: "./Models/jacket.glb", avatar: false,
        outfit: {
            occluders: [/Head$/, /Body/, /Bottom/],
            hidden: [/Eye/, /Teeth/, /Footwear/, /Glasses/]
        }
    },
     piastriSuit: {
        file: "./Models/piastri_suit.glb", avatar: false,
        outfit: {
            occluders: [/Head$/, /Body/],
            hidden: [/Eye/, /Teeth/]
        }
    },
    noCloth: {
        file: "./Models/base.glb", avatar: false,
        outfit: {
            occluders: [/Head$/, /Body/, /Bottom/],
            hidden: [/Eye/, /Teeth/, /Bottom/, /Footwear/, /Headwear/]
        }
    }
}    


export const hatMap: { [key: string]: { file: string, offset?: Vector3, scale?: Vector3 } } =
{
    dadA: {
        file: "./Models/dadA.glb",
        offset: new Vector3(0, 0.106, 0.04),
        scale: new Vector3(.9, .9, 1)
    },
    dadB: {
        file: "./Models/dadB.glb",
        offset: new Vector3(0, 0.106, 0.04),
        scale: new Vector3(.9, .9, 1)
    },
    painterA: {
        file: "./Models/painterA.glb",
        offset: new Vector3(0, 0.106, 0.04),
        scale: new Vector3(.9, .9, 1)
    },
    painterB: {
        file: "./Models/painterB.glb",
        offset: new Vector3(0, 0.106, 0.04),
        scale: new Vector3(.9, .9, 1)
    },
    piastriHelmet: {
        file: "./Models/piastri_hat.glb",
        offset: new Vector3(0,0.106,0.04),
        scale: new Vector3(.8, .8, .8)
    },
    noHat: {
        file: "./Models/noHat.glb",
    }
}

export const bgMap: { [key: string]: { file: string } } =
{
    bg1: {
        file: "./UI/BG/Baseball_Background.png"
    },
    bg2: {
        file: "./UI/BG/F1_Background.png"
    },
    bg3: {
        file: "./UI/BG/Golf_Background.png"
    },
    bg4: {
        file: "./UI/BG/Red_Carpet_Background.png"
    },
    bg5: {
        file: "./UI/BG/Soccer_Background.png"
    },
    bg6: {
        file: "./UI/BG/Tennis_Background.png"
    },
    noBg: {
        file: "./UI/BG/No_BG_Neutral.png"
    }
}