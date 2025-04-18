// uiController.ts
export class UIController {
    public backgroundImg: HTMLElement;
    public holdingScreen: HTMLElement;
    public startButton: HTMLButtonElement;
    public video: HTMLVideoElement;
    public faceCanvas: HTMLCanvasElement;
    public faceCtx: CanvasRenderingContext2D;
    public container: HTMLElement;
    public transposeButton: HTMLButtonElement;
    public recordButton: HTMLButtonElement;
    public exportButton: HTMLButtonElement;
    public outfitButtons: NodeListOf<HTMLInputElement>;
    public hatButtons: NodeListOf<HTMLInputElement>;
    public bgButtons: NodeListOf<HTMLInputElement>;
    public welcomeMessage: HTMLElement;

    /**
     * Visibility state flags
     */
    public isHoldingScreen: boolean;
    public isWelcomeVisible: boolean;

    private static _instance: UIController;

    /**
     * Singleton accessor
     */
    public static getInstance(): UIController {
        if (!UIController._instance) {
            UIController._instance = new UIController();
        }
        return UIController._instance;
    }

    /**
     * Private constructor to enforce singleton
     */
    private constructor() {
        // DOM lookups
        const bgi = document.getElementById("background");
        const hs = document.getElementById("holding-screen");
        const sb = document.getElementById("start-button");
        const videoEl = document.getElementById("video");
        const faceCanvasEl = document.getElementById("faceCanvas");
        const containerEl = document.getElementById("root");
        const transposeBtn = document.getElementById("orientation");
        const recordBtn = document.getElementById("record");
        const exportBtn = document.getElementById("export-csv");
        const outfitBtns = document.getElementsByName("model");
        const hatBtns = document.getElementsByName("hat");
        const bgBtns = document.getElementsByName("bg");
        const welcomeEl = document.getElementById("welcome-message");

        // Validate mandatory elements
        if (!bgi || !hs || !sb || !videoEl || !faceCanvasEl || !containerEl || !transposeBtn || !recordBtn || !exportBtn || !welcomeEl) {
            throw new Error("Missing one or more UI elements in DOM");
        }
        // Type checks
        if (!(videoEl instanceof HTMLVideoElement)) throw new Error("#video is not a HTMLVideoElement");
        if (!(faceCanvasEl instanceof HTMLCanvasElement)) throw new Error("#faceCanvas is not a HTMLCanvasElement");
        if (!(transposeBtn instanceof HTMLButtonElement)) throw new Error("#orientation is not a HTMLButtonElement");
        if (!(recordBtn instanceof HTMLButtonElement)) throw new Error("#record is not a HTMLButtonElement");
        if (!(exportBtn instanceof HTMLButtonElement)) throw new Error("#export-csv is not a HTMLButtonElement");

        // Assign references
        this.backgroundImg       = bgi;
        this.holdingScreen       = hs;
        this.startButton         = sb as HTMLButtonElement;
        this.video               = videoEl;
        this.faceCanvas          = faceCanvasEl;
        this.faceCtx             = faceCanvasEl.getContext("2d")!;
        this.container           = containerEl;
        this.transposeButton     = transposeBtn as HTMLButtonElement;
        this.recordButton        = recordBtn as HTMLButtonElement;
        this.exportButton        = exportBtn as HTMLButtonElement;
        this.outfitButtons       = outfitBtns as NodeListOf<HTMLInputElement>;
        this.hatButtons          = hatBtns as NodeListOf<HTMLInputElement>;
        this.bgButtons           = bgBtns as NodeListOf<HTMLInputElement>;
        this.welcomeMessage      = welcomeEl;

        // Initial state flags
        this.isHoldingScreen = false;
        this.isWelcomeVisible = false;

        // Initial UI state: hide messages and show holding screen
        this.welcomeMessage.style.display = "none";
        this.showHoldingScreen();
        this.enableStartButtonInteraction();
    }

    /** Show the holding screen overlay with fade-in */
    public showHoldingScreen() {
        if (!this.isHoldingScreen) {
            this.holdingScreen.style.display = "flex";
            this.holdingScreen.classList.remove("fade-out");
            this.holdingScreen.classList.add("fade-in");
            this.isHoldingScreen = true;
        }
    }

    /** Hide the holding screen overlay after fade-out finishes */
    public hideHoldingScreen() {
        if (this.isHoldingScreen) {
            this.holdingScreen.classList.remove("fade-in");
            this.holdingScreen.classList.add("fade-out");
            const onEnd = () => {
                this.holdingScreen.style.display = "none";
                this.holdingScreen.removeEventListener("animationend", onEnd);
                this.isHoldingScreen = false;
            };
            this.holdingScreen.addEventListener("animationend", onEnd);
        }
    }

    /** Show the welcome message with fade-in */
    public showWelcomeMessage() {
        if (!this.isWelcomeVisible) {
            this.welcomeMessage.style.display = "flex";
            this.welcomeMessage.style.zIndex = "9999";
            this.welcomeMessage.classList.remove("fade-out");
            this.welcomeMessage.classList.add("fade-in");
            this.isWelcomeVisible = true;
            console.log("welcomemesge on");
        }
    }

    /** Hide the welcome message after fade-out finishes */
    public hideWelcomeMessage() {
        if (this.isWelcomeVisible) {
            this.welcomeMessage.classList.remove("fade-in");
            this.welcomeMessage.classList.add("fade-out");
            const onEnd = () => {
                this.welcomeMessage.style.display = "none";
                this.welcomeMessage.removeEventListener("animationend", onEnd);
                this.isWelcomeVisible = false;
                console.log("welcomemesge false");
            };
            this.welcomeMessage.addEventListener("animationend", onEnd);
        }
    }

    /** Disable clicks on the start button */
    public disableStartButtonInteraction() {
        this.startButton.disabled = true;
        this.startButton.style.pointerEvents = "none";
    }

    /** Re-enable clicks on the start button */
    public enableStartButtonInteraction() {
        this.startButton.disabled = false;
        this.startButton.style.pointerEvents = "auto";
    }

    // Additional UI control methods can be added here
}
