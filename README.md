![NAVI Cover](capa-projeto.png)

# 🚀 NAVI | AI-Powered Personal Co-Pilot (PWA)

**NAVI** is a mobile-first Progressive Web App (PWA) designed to be a personal co-pilot for productivity, mental well-being, and focus. Built with a "Chameleon Engine", it uses on-device Machine Learning to adapt its entire UI and experience based on the user's environment.

##  Why This Exists
Developers and creators often struggle with burnout, tutorial hell, and anxiety. NAVI solves this by providing a zero-friction, privacy-first tool that gamifies focus and offers immediate grounding techniques, all running locally on the device.

## 🧠 Key Technical Features
- **On-Device AI Vision:** Utilizes `@tensorflow-models/mobilenet` (alpha 0.25) to classify user-uploaded images in real-time (~5MB model), adapting the CSS variables and UI theme dynamically (e.g., detects "guitar" → Artist Mode; detects "laptop" → Aviator Mode).
- **100% Privacy-First:** Zero backend. All image processing, state management, and "Flight Log" history are stored exclusively in the browser's `localStorage`. No data leaves the device.
- **PWA Architecture:** Fully installable on iOS and Android with `manifest.json` and standalone display modes, providing a native app-like experience without the App Store overhead.
- **Web Speech API Integration:** Hands-free "Control Tower" voice commands for accessibility and focus.

## 🎨 Adaptive UI Showcase

### ✈️ Aviator / Tech Mode
*Activated when the AI detects technology, aviation, or focus-related objects.*
![Aviator Mode](aviador-tech.png)

### 🎸 Artist / Music Mode
*Activated when the AI detects musical instruments, art supplies, or creative environments.*
![Artist Mode](artist-music.png)

### 🌿 Nature / Calm Mode
*Activated when the AI detects plants, nature, or wellness-related objects.*
![Nature Mode](natureza-calma.png)

## 🛠️ Tech Stack
- **Core:** HTML5, CSS3 (Dynamic Theming via CSS Variables), Vanilla JavaScript (ES6+).
- **Machine Learning:** TensorFlow.js, MobileNet.
- **Storage:** Browser `localStorage`.

## 🚀 How to Test
1. Clone this repository or visit the live demo.
2. For the best experience, open on a mobile browser and select "Add to Home Screen".
3. Upload an image (e.g., a musical instrument, a plant, or tech gear) to watch the AI adapt the interface instantly.

## 🎯 The Vision
NAVI proves that powerful, adaptive AI doesn't require massive cloud servers. It can run efficiently in the browser, empowering students and creators to maintain focus and mental clarity. 

*Next Step: Porting this logic to React Native / Flutter for a native Play Store/App Store release.*

---
*Developed by Felipe Madrid | Building the future, one line of code at a time.*