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
    public scanner: HTMLElement;
    public scannerFrame: HTMLElement;
    //public recordButton: HTMLButtonElement;
    public exportButton: HTMLButtonElement;
    public optionsToggle: HTMLButtonElement;
    public optionsMenu: HTMLElement;
    public calibrateButton: HTMLButtonElement;
    public switchCameraButton: HTMLButtonElement;
    public outfitButtons: NodeListOf<HTMLInputElement>;
    public hatButtons: NodeListOf<HTMLInputElement>;
    public bgButtons: NodeListOf<HTMLInputElement>;
    public welcomeMessage: HTMLElement;

    /**
     * Visibility state flags
     */
    public isHoldingScreen: boolean;
    public isWelcomeVisible: boolean;
    private _stopBallLoop?: () => void;
    private _stopRingLoop?: () => void;

    private scanTimeout: number | null = null;

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
        //const recordBtn = document.getElementById("record");
        const exportBtn = document.getElementById("export-csv");
        const optionsToggle = document.getElementById("options-toggle");
        const optionsMenu = document.getElementById("options-menu");
        const calibrateBtn = document.getElementById("calibrate");
        const cameraBtn = document.getElementById("switch-camera");
        const outfitBtns = document.getElementsByName("model");
        const hatBtns = document.getElementsByName("hat");
        const bgBtns = document.getElementsByName("bg");
        const welcomeEl = document.getElementById("welcome-message");
        const scanEl = document.getElementById('scanner-overlay');
        const scanFrameEl = document.getElementById('scanner-frame');
        // Validate mandatory elements
        if (!scanFrameEl || !scanEl || !bgi || !hs || !sb || !videoEl || !faceCanvasEl || !containerEl || !transposeBtn || !exportBtn || !welcomeEl || !optionsToggle || !optionsMenu || !calibrateBtn || !cameraBtn) {
            throw new Error("Missing one or more UI elements in DOM");
        }
        // Type checks
        if (!(videoEl instanceof HTMLVideoElement)) throw new Error("#video is not a HTMLVideoElement");
        if (!(faceCanvasEl instanceof HTMLCanvasElement)) throw new Error("#faceCanvas is not a HTMLCanvasElement");
        if (!(transposeBtn instanceof HTMLButtonElement)) throw new Error("#orientation is not a HTMLButtonElement");
        //if (!(recordBtn instanceof HTMLButtonElement)) throw new Error("#record is not a HTMLButtonElement");
        if (!(exportBtn instanceof HTMLButtonElement)) throw new Error("#export-csv is not a HTMLButtonElement");
        if (!(optionsToggle instanceof HTMLButtonElement)) throw new Error("#options-toggle is not a HTMLButtonElement");
        if (!(calibrateBtn instanceof HTMLButtonElement)) throw new Error("#calibrate is not a HTMLButtonElement");
        if (!(cameraBtn instanceof HTMLButtonElement)) throw new Error("#switch-camera is not a HTMLButtonElement");

        // Assign references
        this.backgroundImg = bgi;
        this.holdingScreen = hs;
        this.startButton = sb as HTMLButtonElement;
        this.video = videoEl;
        this.faceCanvas = faceCanvasEl;
        this.faceCtx = faceCanvasEl.getContext("2d")!;
        this.container = containerEl;
        this.transposeButton = transposeBtn as HTMLButtonElement;
        //this.recordButton        = recordBtn as HTMLButtonElement;
        this.exportButton = exportBtn as HTMLButtonElement;
        this.optionsToggle = optionsToggle as HTMLButtonElement;
        this.optionsMenu = optionsMenu as HTMLElement;
        this.calibrateButton = calibrateBtn as HTMLButtonElement;
        this.switchCameraButton = cameraBtn as HTMLButtonElement;
        this.outfitButtons = outfitBtns as NodeListOf<HTMLInputElement>;
        this.hatButtons = hatBtns as NodeListOf<HTMLInputElement>;
        this.bgButtons = bgBtns as NodeListOf<HTMLInputElement>;
        this.welcomeMessage = welcomeEl;
        this.scanner = scanEl;
        this.scannerFrame = scanFrameEl;

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

            // if there were previous animations, stop them first
            this._stopBallLoop?.();
            this._stopRingLoop?.();

            // start fresh, and keep the returned stop-functions
            this._stopBallLoop = this.startFrameAnimation(
                "ball-loop",
                "/Ball_Loop_Anim_Frames",
                "Ball_Loop_V2",
                300,
                24
            );
            this._stopRingLoop = this.startFrameAnimation(
                "ring-loop",
                "/Rings_Loop_Anim_Frames",
                "Circles_loop_",
                300,
                24
            );
        }
    }

    /** Hide the holding screen overlay after fade-out finishes */
    public hideHoldingScreen() {
        if (this.isHoldingScreen) {
            // stop the animations immediately
            this._stopBallLoop?.();
            this._stopRingLoop?.();
            this._stopBallLoop = undefined;
            this._stopRingLoop = undefined;

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
            this.welcomeMessage.setAttribute(
                'data-title',
                'VIRTUAL TRY-ON'
            )
            this.welcomeMessage.setAttribute(
                'data-subtitle',
                '\n\nWELCOME TO\nTHE FUTURE OF RETAIL'
            )
            this.welcomeMessage.style.display = "flex";
            this.welcomeMessage.style.zIndex = "10000";
            this.welcomeMessage.classList.remove("hidden");
            this.welcomeMessage.classList.remove("fade-out");
            this.welcomeMessage.classList.add("fade-in");
            this.isWelcomeVisible = true;
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

    public showScanAnimation(duration: number = 3000) {
        this.scanner.classList.remove('hidden');
        this.scannerFrame.classList.remove('hidden');

        // Clear any previous timeout
        if (this.scanTimeout !== null) {
            clearTimeout(this.scanTimeout);
        }

        // Auto-hide after duration
        this.scanTimeout = window.setTimeout(() => {
            this.hideScan();
        }, duration);

    }
    public hideScan() {
        if (this.scanTimeout !== null) {
            clearTimeout(this.scanTimeout);
            this.scanTimeout = null;
        }
        this.scanner.classList.add('hidden');
        this.scannerFrame.classList.add('hidden');
    }

    public toggleOptions() {
        this.optionsMenu.classList.toggle('hidden');
    }

    public updateCarouselTextures(buttons: NodeListOf<HTMLInputElement>) {
        buttons.forEach(btn => {
          const bg = btn.style.backgroundImage
          if (btn.checked) {
            btn.style.backgroundImage = bg.replace(/Neutral/g, "Hit")
          } else {
            btn.style.backgroundImage = bg.replace(/Hit/g, "Neutral")
          }
        })
      }


    public startFrameAnimation(
        imgElementId: string,
        folderPath: string,
        filePrefix: string,
        frameCount: number,
        fps: number
    ): () => void {
        const img = document.getElementById(imgElementId) as HTMLImageElement | null;
        if (!img) throw new Error(`No <img> found with id '${imgElementId}'`);

        // build frame URLs
        const frames = Array.from({ length: frameCount }, (_, i) => {
            const idx = String(i).padStart(5, '0');
            return `${folderPath}/${filePrefix}_${idx}.png`;
        });

        // preload frames
        frames.forEach(src => { const pre = new Image(); pre.src = src; });

        let current = 0;
        const intervalMs = 1000 / fps;
        const timerId = window.setInterval(() => {
            img.src = frames[current];
            current = (current + 1) % frames.length;
        }, intervalMs);

        // return a stop function
        return () => window.clearInterval(timerId);
    }
}
