# 🎵 SyncBeat

SyncBeat is a real-time, collaborative music lounge that lets you listen to YouTube tracks in perfect synchronization with your friends. Zero sign-ups, zero accounts, and zero lag.

---

## ✨ Key Features

* **Instant Room Creation**: Create or join custom listening rooms instantly.
* **Realtime Presence**: See who is currently in the room with live indicators powered by Supabase Presence.
* **Synchronized Playback**: Host play, pause, and seek actions are broadcasted immediately to all guests with network-latency compensation.
* **Collaborative Queue**: Search YouTube directly within the app and append songs to a shared queue stored in PostgreSQL.
* **Smart Host Election**: The creator of the room remains the host across page refreshes, and the host status transitions dynamically if the host leaves.

---

## 🧭 Navigation Guide

### 1. The Entrance (Home Page)
* **Create/Join a Room**: Enter any room code (e.g. `chill-lounge`) or use the auto-generated code, then click **Create / Join**.
* **Enter Nickname**: Provide a temporary display name to join the room.

### 2. The Music Lounge (Room View)
Once inside the room, the application is divided into a clean, two-column layout:

#### 📺 Left Panel: The Player
* **YouTube Video Screen**: Houses the active media stream.
* **Control Bar**: Single-line controls containing the **Volume Slider**, **Previous Track**, **Play/Pause Toggle**, and **Next Track**.
* **Progress Bar**: Synchronized seeker displaying live progress, matching time stamps, and interactive seeking for the Host.

#### 🗂️ Right Panel: Room Controls
Toggle between these specialized sections:
* **🔍 Search**: Enter queries to find YouTube videos. Click **Add to Queue** to insert them into the shared list instantly.
* **📋 Queue**: Displays the **Now Playing** track at the top, followed by the **Up Next** list. Songs transition automatically as they finish.
* **👥 Members**: Lists everyone currently connected to the room. The room creator carries a **Host** badge.
* **🔗 Invite**: Copy the unique shareable link to invite friends.

---

## 🛠️ Tech Stack

* **Frontend**: Next.js (App Router), React, Tailwind CSS
* **Database**: PostgreSQL (via Supabase)
* **Realtime Synchronization**: Supabase Realtime (Presence & Broadcast)
* **Video Playback**: YouTube IFrame Player API
