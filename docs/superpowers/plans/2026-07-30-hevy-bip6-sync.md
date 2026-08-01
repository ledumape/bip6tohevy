# Hevy Bip 6 Workout Sync Implementation Plan

**Goal:** Synchronize Hevy routines and workouts to the Amazfit Bip 6, track sets on the watch, and upload the completed workout back to Hevy.

**Architecture:** The Zepp Side Service runs in the Zepp phone app, stores the Hevy API key, calls Hevy over HTTPS, and communicates with the watch app over Bluetooth. The watch app displays one exercise at a time and sends completed-set data back to the Side Service.

**Tech Stack:** Zepp OS 4.2 APIs, `@zos/ui`, `@zos/ble`, Side Service `fetch`, Hevy public REST API.

## Global Constraints

- Never put the Hevy API key in the watch-side bundle.
- The user must place a newly generated key only in `side-service/config.local.js`.
- The integration requires Hevy Pro and a paired Bip 6.
- The first version targets the Bip 6 390x450 display.

### Task 1: Hevy API client

Create a Side Service client with `listRoutines`, `getRoutine`, `listWorkouts`, and `createWorkout`, plus tests using a fake fetch implementation.

### Task 2: Phone-to-watch transport

Add MessageBuilder-based request/response messages for sync, set completion, and workout completion.

### Task 3: Watch workout UI

Replace the color demo with exercise/set cards and buttons for decrement, increment, complete set, next exercise, and finish workout.

### Task 4: Side Service orchestration

Load the selected routine, send normalized workout data to the watch, collect completed sets, and submit a completed workout to Hevy.

### Task 5: Build and device verification

Build for Bip 6, confirm the key is absent from the device bundle, and produce a new QR preview.
