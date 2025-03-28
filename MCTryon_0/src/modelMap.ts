import { OutfitParams } from "@geenee/bodyrenderers-common";
export const outfitMap: {
    [key: string]: {
        file: string, avatar: boolean,
        outfit?: OutfitParams
    }
} = {
    polo: {
        file: "./public/Models/polo.glb", avatar: false,
        outfit: {
            occluders: [/Head$/, /Body/],
            hidden: [/Eye/, /Teeth/, /Bottom/, /Footwear/, /Glasses/]
        }
    },
    tee: {
        file: "./public/Models/tee.glb", avatar: false,
        outfit: {
            occluders: [/Head$/, /Body/],
            hidden: [/Eye/, /Teeth/, /Bottom/, /Footwear/, /Glasses/]
        }
    },
    quarter: {
        file: "./public/Models/quarter.glb", avatar: false,
        outfit: {
            occluders: [/Head$/, /Body/],
            hidden: [/Eye/, /Teeth/, /Bottom/, /Footwear/, /Glasses/]
        }
    },
    noCloth: {
        file: "./public/Models/base.glb", avatar: false,
        outfit: {
            occluders: [/Head$/, /Body/],
            hidden: [/Eye/, /Teeth/, /Bottom/, /Footwear/, /Headwear/]
        }
    }    
}

export const hatMap: {[key: string]: {file: string}} =
{
    dadA: {
        file: "./public/Models/dadA.glb"        
    },    
    dadB: {
        file: "./public/Models/dadB.glb"
    },
    painterA: {
        file: "./public/Models/painterA.glb"
    },
    painterB: {
        file: "./public/Models/painterB.glb"
    },        
    noHat: {
        file: "./public/Models/noHat.glb"
    }        
}