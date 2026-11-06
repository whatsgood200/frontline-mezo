# Pitch video

`frontline-pitch.mp4` (1:44, 1080p, captions burned in) and `frontline-pitch.srt` (captions for YouTube). Script: `docs/video-script.md`.

How it was made, all on this machine:
- Voice: Windows' built-in "Microsoft Mark" voice through the WinRT speech API (`tools/synth.ps1`), synthetic speech, offline.
- Screens: Playwright driving the installed Chrome at 1440x810 CSS pixels and 4/3 scale (1920x1080 output). Live-site shots come from https://frontline-mezo.vercel.app (`tools/capture-live.js`). Borrow, Redeem Lab, My loan and Proof come from a local anvil fork of Mezo testnet with the real MUSD and Frontline contracts (`tools/capture-fork.js` after `pnpm fork:setup`); every fork shot carries a "Local fork of Mezo testnet" badge.
- Cards: HTML rendered with the same Playwright setup (`tools/cards.js`).
- Cut: ffmpeg stills with slow zooms, voice per section, captions timed to the voice (`tools/build.py`).
