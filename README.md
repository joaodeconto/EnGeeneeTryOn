# AR Try‑On Mirror

## Table of Contents

1. [Project Overview](#project-overview)
2. [Scope and Goals](#scope-and-goals)
3. [UX Flow](#ux-flow)
4. [Features](#features)
5. [Architecture & File Structure](#architecture--file-structure)
6. [Technical Details](#technical-details)
7. [Setup & Installation](#setup--installation)
8. [Usage](#usage)
9. [Configuration & Calibration](#configuration--calibration)
10. [Customization & Extension](#customization--extension)
11. [Future Improvements](#future-improvements)
12. [Contributing](#contributing)
13. [License](#license)

---

## Project Overview

The **AR Try‑On Mirror** is a web‑based AR experience that enables users to virtually try on clothing and accessories. It uses live video input, 3D overlays, and an intuitive interface to provide a realistic, interactive fitting room.

Key components:

* **Live video background**: Full‑screen video loop guiding the user through the experience.
* **Avatar & outfit rendering**: Dynamically swap garments and hats on a detected body outline.
* **Calibration & sizing**: Estimate user height and triangulate pixel measurements for accurate sizing.
* **UI controls**: Carousel selectors for outfits, hats, and backgrounds.

---

## Scope and Goals

* Provide a **standalone**, **modular** AR mirror that runs entirely in the browser.
* Deliver **reliable** garment overlays with smooth transitions and realistic placement.
* Offer **easy calibration** so users can input their actual height for precise measurements.
* Ensure **extensibility**: developers can swap models, adjust UX timings, and integrate new features.

---

## UX Flow

1. **Holding Screen**: a looping background video plays; a central “golfball” button invites interaction.
2. **Welcome Message** (2–3s): greets the user.
3. **Stand Instruction** (3–5s): prompts user to stand on a marker for scanning.
4. **Scanning Animation**: green wipe effect scans the frame top‑to‑bottom.
5. **Finished Message**: scan complete.
6. **Interaction UI**: carousels appear to select outfits, hats, and backgrounds.
7. **Try‑On**: chosen merch fades onto user model; size estimate displayed.

---

## Features

* **Responsive Full‑Screen Layout**: adapts to mobile and desktop.
* **Video Background**: muted loop with fade‑out transitions.
* **Interactive Button**: central golfball with press animation and audio cues.
* **Guided Prompts**: sequential messages guiding user actions.
* **Calibration Module**: button to input user height for pixel‑to‑cm conversion.
* **Carousel Selectors**: choose among multiple outfits, hats, and backgrounds.

* **Options Menu**: toggle actions like calibration, camera switching and smile export. Also adjust the delay before the holding screen reappears when no pose is detected.

* **Size Estimation Display**: shows calculated clothing size in real time.

---

## Architecture & File Structure

The project is organized inside the `pose-babylon` folder which contains all
runtime code and assets:

* `src/` – TypeScript sources for rendering, detection and UI logic.
* `public/` – static files served by Vite including HTML templates and images.
* `index.html` – entry page bootstrapping the AR mirror.

At the repository root you will find the project README and configuration files.

---

## Technical Details

* **Language & Frameworks**:

  * TypeScript (ES module)
  * HTML5, CSS3 with custom animations
  * Optional bundler (e.g., Vite, Webpack)
    
## Setup & Installation

1. **Clone Repository**:

   ```bash
   git clone <repo_url>
   cd pose-babylon
   ```
2. **Install Dependencies** (if using bundler):

   ```bash
   npm install
   ```
3. **Serve Locally**:

   * With `npm` script: `npm run dev`
   * Or simple HTTP server: `npx serve .`
4. **Access**:

   * Open `http://localhost:3000` in a modern browser (Chrome, Safari).

---

## Usage

1. **Press Start**: click the golfball icon to begin.
2. **Follow Prompts**: stand on the marker, wait for scan.
3. **Interact**: select items from the right/left carousels.
4. **View Size**: your estimated clothing size appears at bottom right.
5. **Toggle Orientation**: switch between portrait/landscape via top‑right button.
6. **Export/Record**: use top buttons to export measurements CSV or record session.

---

## Configuration & Calibration

* **User Height Input**: implement a calibration dialog (button trigger) for entering real height. Use this value alongside shoulder pixel distance to compute a conversion factor.
* **Model Assets**: swap `Neutral/*` images in carousels to add new garments.
* **Timing**: adjust CSS animation durations and UX timing constants in `index.ts` based on UX spec.

---

## Customization & Extension

* **Add More Carousels**: replicate markup under `#outfitButtons` with new `name` attributes.
* **Integrate New AR SDKs**: replace face/body detection in `index.ts` with your chosen library (e.g., MediaPipe, face-api).
* **Audio Feedback**: hook custom sounds in `audioManager.ts` for clicks and prompts.

---

## Future Improvements

Planned enhancements include:

* **Performance tuning** for mobile devices.
* **Expanded garment library** with additional sample models.
* **Automated calibration** using more precise body metrics.

---

## License

MIT © 2025 AR Try‑On Mirror Project
