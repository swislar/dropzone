# Dropzone 🎯

A high-octane, physics-powered 3D night-carnival pinball name picker and decision maker. Add names, customize marble colors, and drop player marbles into a procedurally generated pinball machine to see who takes 1st place!

---

## ✨ Key Features

### 🎰 3D Arcade Pinball Experience
- **Matter.js Physics Simulation**: Real-time rigid body dynamics, elasticity, friction, and recoil.
- **3D Render Pipeline**: Canvas-rendered marbles with specular lighting, soft motion trails, impact flash rings, CRT scanline overlay, and a dark neon arcade cabinet aesthetic.

### 👥 Flexible Player Management
- **Roster Capacity**: Supports up to **50 players** in a single race.
- **Bulk Add Mode**: Quickly paste line-separated or comma-separated lists of names. Built-in duplicate detection prevents accidental double entries.
- **Interactive Roster Tools**: Dynamic capacity gauge, per-player remove button, and a one-click **Clear All** action.

### 🎨 Color & Visual Customization
- **Auto-Assigned Palettes**: Smart initial color distribution using vibrant, high-contrast HSL color palettes.
- **Color Swatch Picker**: Custom inline color picker for fine-tuning individual marble hues.
- **Shuffle Colors**: Instantly randomize colors across all players with a single click.

### 🎲 Pinball Course
- **Starter Pod Chambers**: Individual starting pod boxes with synchronized animated trapdoors.
- **Interactive Obstacles**: Multi-tier pop bumpers with gentle breathing idle glows, springy side slingshots, deflector posts, and staggered peg fields.
- **High-Power Plungers & Booster Funnels**: Coiled spring plungers launch out-of-bounds marbles back to the top tube, while outward funnel ramps with animated neon chevrons channel marbles away from the center.

### 🏆 Win Conditions & Podium Reveal
- **Golden Win Slot 👑**: Centered 95px win pit at the bottom of the course.
- **Dynamic Countdown**: Once the first marble enters the Golden Win Slot, a **3.5-second finish timer** initiates to let runner-up marbles fight for 2nd and 3rd place podium spots.
- **Sequential Results Screen**: Confetti celebration with a sequential reveal of ranked finishes.

### 💾 Hall of Fame & Sound Effects
- **Persistent Local Data**: Keeps track of total races run on your device and maintains a cumulative **Hall of Fame** win tally per player.
- **Procedural Web Audio**: Zero-asset audio synthesized via Web Audio API (trapdoor release notes, impact sounds, and winner fanfare), complete with a top-corner mute toggle.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- `npm` (comes with Node.js)

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd dropzone
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```
   Open your browser at the URL shown in the terminal (typically `http://localhost:5173`).

### Available Scripts

- `npm run dev`: Starts the Vite development server with hot module replacement (HMR).
- `npm run build`: Builds the production-ready bundle into the `dist/` directory.
- `npm run preview`: Previews the local production build.
- `npm run lint`: Runs [Oxlint](https://github.com/oxc-project/oxc) for lightning-fast code linting.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Physics Engine**: [Matter.js](https://brm.io/matter-js/)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Styling**: Vanilla CSS (CSS Variables, Flexbox/Grid, Animations)
- **Sound**: Web Audio API (Synthesized tone generator)
- **Effects**: [canvas-confetti](https://www.npmjs.com/package/canvas-confetti)
- **Linter**: [Oxlint](https://oxc.rs/)