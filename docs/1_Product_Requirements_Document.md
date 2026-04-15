# AI Cricket Umpire PWA - Product Requirements Document

## 1. Executive Summary

**The Product**
AI Cricket Umpire PWA is a real-time, computer-vision-powered cricket umpiring and scoring platform. It caters to both hyper-casual "Gully Cricket" and serious "Professional Tournaments" by offering dual operational modes. 

**Why It Matters**
Local matches suffer from subjective umpiring and zero player analytics. Existing solutions cost thousands of dollars.

**Market Opportunity**
Cricket is the second most popular sport globally. A mobile-first, zero-hardware solution taps an untouched bottom-up market, allowing local players to finally track their individual stats across seasons.

***

## 2. Product Requirements Document (PRD)

### 1. Match Modes Architecture (Dual Hierarchy)
The system must support two drastically different workflows based on user needs:
*   **Quick Match (Gully Mode):** Frictionless setup. Just input Team A vs Team B names and start the match. Analytics are strictly team-based. No player tracking. Perfect for 10-minute tennis ball games.
*   **Professional Match (Tournament Mode):** Requires Authentication. Captains enter/select an 11-player roster before the toss. Tracks granular individual analytics (Runs off balls faced, Strike Rate, Bowler Economy, Pitch Maps per Bowler). 

### 2. User Authentication & Authorization
*   Users must be able to create accounts (Captains/Umpires/Players).
*   Matches played in "Tournament Mode" are permanently tied to user accounts to build long-term statistical profiles.

### 3. User Personas
*   **The Match Organizer/Captain:** Sets up rosters. Wants detailed player stats.
*   **The Stand-in Umpire:** Wants simple UI to record balls.
*   **The Aspiring Pro:** Cares deeply about their individual profile and performance graphs.

### 4. Functional Requirements
*   Live camera feed ingestion via browser.
*   Real-time computer vision inference.
*   **Dynamic UI:** The Umpire HUD must adapt based on the selected Match Mode (showing Batter/Bowler selection dropdowns only in Pro Mode).
*   Live synchronized scoreboard across multiple devices.

### 5. Minimum Viable Product (MVP) Scope
*   **Core Mechanics:** Wide/No-Ball engine, Camera integration.
*   **Authentication & Roster:** JWT/Firebase auth, Dynamic 11-player inputs in Setup.
*   **Analytics Engine:** Relational schema capable of assigning a `Delivery` to a specific `Player` entity.

### 6. KPIs / Success Metrics
*   **System:** Inference accuracy > 85% for Wides/No-Balls.
*   **User:** 10 "Tournament Mode" matches completed with full player rosters.
*   **Retention:** 50% of players returning to check their personal analytics dashboard post-match.
