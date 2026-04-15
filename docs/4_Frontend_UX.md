# AI Cricket Umpire PWA - Frontend UX Design

A good PWA must feel native. Disable text selection (`select-none`), remove native browser scrolling rubber-banding, and use safe-area insets.

### 1. Home / Dashboard
*   "Start Match"
*   "My History"
*   "Practice Nets"

### 2. Match Setup
*   Select Teams / Players (fast auto-complete).

### 3. Camera Setup (Crucial)
*   A semi-transparent overlay shows a "Stump Alignment Guide".
*   Instructions: "Place phone on tripod 2 meters behind stumps."

### 4. Live Umpire HUD (Heads Up Display)
*   **Top:** Score (e.g., IND 45-2 (5.3)).
*   **Center:** Live camera feed with bounding boxes drawn over it (using HTML5 Canvas synced to video).
*   **Bottom:** Large, ergonomic buttons for manual overrides (0, 1, 2, 4, 6, Wicket). The AI pre-selects the button based on prediction, user just taps 'Confirm' to speed things up.

### 5. Review Screen
*   The "DRS" screen. Shows a slow-motion replay of the last 4 seconds with a drawn red trajectory line.
