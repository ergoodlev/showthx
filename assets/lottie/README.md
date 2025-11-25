# Lottie Frame Animations

This directory contains Lottie JSON animation files for video frame overlays.

## Required Files

Place the following Lottie JSON files in this directory:

1. `birthday-balloons.json`
2. `confetti-celebration.json`
3. `sparkle-stars.json`
4. `floating-hearts.json`
5. `fireworks-burst.json`
6. `rainbow-border.json`
7. `cute-dinosaurs.json`
8. `magic-unicorn.json`
9. `space-rockets.json`
10. `flower-garden.json`
11. `thank-you-sparkle.json`

## Where to Download

See `/LOTTIE_DOWNLOAD_INSTRUCTIONS.md` in the project root for exact download links and instructions.

## Usage

These animations are loaded by `frameService.js` and displayed in `FrameSelectionScreen.js`.

The app will gracefully handle missing files by filtering them out of the frame library.
