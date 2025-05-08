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
    noCloth: {
        file: "./Models/base.glb", avatar: false,
        outfit: {
            occluders: [/Head$/, /Body/, /Bottom/],
            hidden: [/Eye/, /Teeth/, /Bottom/, /Footwear/, /Headwear/]
        }
    },
    onesie: {
        file: "./Models/onesie.glb", avatar: false,
        outfit: {
            occluders: [/Head$/, /Body/, /Bottom/],
            hidden: [/Eye/, /Teeth/]
        }
    },
    jacket: {
        file: "./Models/jacket.glb", avatar: false,
        outfit: {
            occluders: [/Head$/, /Body/, /Bottom/],
            hidden: [/Eye/, /Teeth/, /Footwear/, /Glasses/]
        }
    }
}    


export const hatMap: { [key: string]: { file: string } } =
{
    dadA: {
        file: "./Models/dadA.glb"
    },
    dadB: {
        file: "./Models/dadB.glb"
    },
    painterA: {
        file: "./Models/painterA.glb"
    },
    painterB: {
        file: "./Models/painterB.glb"
    },
    noHat: {
        file: "./Models/noHat.glb"
    }
}

export const bgMap: { [key: string]: { file: string } } =
{
    bg1: {
        file: "./Neutral/BG_3.jpeg"
    },
    bg2: {
        file: "./Neutral/BG_2.jpeg"
    },
    bg3: {
        file: "./Neutral/BG_1.jpeg"
    },
    noBg: {
        file: "./Neutral/No_BG_Neutral.png"
    }
}