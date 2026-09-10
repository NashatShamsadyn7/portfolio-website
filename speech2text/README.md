# SpeechFlow - Real-time Speech to Text

**Developer:** Nashat Shamsadyn  
**Version:** 1.0.2  
**Platform:** Windows 10/11

## What is SpeechFlow?

SpeechFlow is a real-time speech-to-text desktop application that listens to your microphone and types what you say wherever your cursor is. It supports English, Arabic, and auto-detect modes.

## Features

- **Real-time speech-to-text** — speak and text appears instantly
- **Auto-type anywhere** — text is typed wherever your cursor is (any app, any field)
- **Multi-language** — English, Arabic, and Auto-detect modes
- **AI text cleanup** — optional grammar and punctuation fixing powered by Google Gemini (free)
- **Always-on-top overlay** — small floating widget with mic button and waveform
- **Pin/unpin overlay** — toggle always-on-top with one click
- **System tray** — runs in background, right-click for quick options
- **Global hotkeys** — control everything with keyboard shortcuts
- **Auto-stop on keypress** — stops listening when you start typing
- **Dark themed UI** — modern, clean interface
- **Portable or installable** — use as standalone exe or install with full setup wizard

## Requirements

- Windows 10 or later
- A working microphone
- A Deepgram API key (free — comes with $200 free credit)
- Optional: Google Gemini API key for AI text cleanup (free)

## Installation

Run `SpeechFlow_Setup_v1.0.2.exe` and follow the setup wizard:

1. Accept the license agreement
2. Read the instructions on how to get your free API key
3. Enter your Deepgram API key (or skip and add later)
4. Choose install location and shortcuts
5. Done! Launch SpeechFlow

## How to Get API Keys

### Deepgram (required — for speech recognition)
1. Go to https://console.deepgram.com/signup
2. Create a free account (comes with $200 free credit)
3. Navigate to API Keys and create a new key
4. Copy and paste it into SpeechFlow

### Google Gemini (optional — for AI text cleanup)
1. Go to https://aistudio.google.com/apikey
2. Click "Create API key"
3. Copy and paste it into SpeechFlow Settings

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Shift+1 | Start listening |
| Ctrl+Shift+2 | Stop listening |
| Ctrl+Shift+A | Switch to Arabic |
| Ctrl+Shift+E | Switch to English |
| Ctrl+Shift+M | Switch to Auto-detect |
| Ctrl+Shift+C | Copy last transcript |

## How to Use

1. Launch SpeechFlow
2. Click the mic button or press **Ctrl+Shift+1** to start listening
3. Speak into your microphone
4. Text appears wherever your cursor is
5. Press any key to stop listening

## Settings

Right-click the overlay or the system tray icon and select **Settings** to:

- Change your Deepgram API key
- Select microphone device
- Switch language mode
- Enable/disable AI text cleanup (Gemini)
- Change theme (dark/light)

## AI Text Cleanup

When enabled, SpeechFlow uses Google Gemini to automatically fix grammar, punctuation, and capitalization before typing the text. This feature is optional and requires a free Google Gemini API key.

## Tips

- SpeechFlow runs in the system tray (bottom-right corner near the clock)
- Right-click the tray icon for quick options
- The app requires Administrator privileges for global keyboard shortcuts
- Close the overlay with X — the app keeps running in the tray
- Click the pin button (📌) to toggle always-on-top
- Right-click tray icon > Quit to fully exit

## Tech Stack

- Python 3.13
- PyQt6 (UI framework)
- Deepgram API (speech recognition)
- Google Gemini API (AI text cleanup)
- PyInstaller (packaging)
- Inno Setup (installer)

## License

Copyright (c) 2026 Nashat Shamsadyn. All rights reserved.

---

**Developed by Nashat Shamsadyn**
