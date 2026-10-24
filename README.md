# JomoRide

JomoRide is an Expo/React Native driver application with an offline-first
Start Duty queue. Duty actions are persisted locally and synchronized when
internet connectivity is available again.

## Technical choices

### State management

The app uses React state and hooks rather than a global state library:

- `useState` exposes the network status, duty status, and pending action count
  to the UI.
- `useRef` stores mutable coordination state that must survive renders without
  causing additional renders. This includes the mounted flag, current
  connectivity value, the operation lock, and whether the driver requested a
  duty action.
- `useCallback` keeps queue and action operations stable for the effect
  subscriptions.
- `useEffect` owns the lifecycle of the network listener, app-state listener,
  and reconnect refresh timer.

The queue is the source of truth for pending work. `expo-sqlite` stores each
action as `pending`, `processing`, or `completed`. On startup, interrupted
`processing` actions are returned to `pending`. `useDutyQueue` reads the queue,
updates the UI, and invokes the synchronization service when NetInfo reports
internet access. A periodic `NetInfo.refresh()` check is also used while the
screen is mounted because a simulator or device may not emit a reliable
reconnection event.

### Native bridging

The project uses Expo-compatible native modules through their JavaScript
bridges:

- `@react-native-community/netinfo` bridges native iOS/Android connectivity
  information to JavaScript through `addEventListener`, `refresh`, and
  `fetch`.
- `expo-sqlite` bridges SQLite database operations to JavaScript through the
  asynchronous database API.
- React Native `AppState` bridges foreground/background lifecycle changes so
  the queue is checked again when the app becomes active.

These modules are autolinked when the native project is generated. The
repository does not manually edit `ios/` or `android/`; those directories are
generated from `app.json` and the installed Expo modules.

## Local development

Install dependencies and start Metro:

```bash
npm install
npx expo start
```

For a fresh Metro bundle, use:

```bash
npx expo start -c
```

When using Expo Go, reload the application after restarting Metro and ensure
Expo Go is connected to the same Metro port shown in the terminal.

## Generate a local Xcode `.ipa`

The repository currently uses Expo Continuous Native Generation, so the
`ios/` directory is generated locally before opening Xcode. The following is
the exact process used to create a local iOS archive and export it as an
`.ipa`.

### Prerequisites

- macOS with Xcode installed and opened at least once.
- An Apple Developer account if the archive will be installed on a physical
  device or distributed outside the simulator.
- CocoaPods installed and available as `pod`.
- Node.js and npm.
- A connected or registered iOS device for a device IPA, or a valid Apple
  signing setup for the selected distribution method.

### Steps

1. From the project root, install JavaScript dependencies:

   ```bash
   npm install
   ```

2. Generate the native iOS project from the Expo configuration:

   ```bash
   npx expo prebuild --platform ios
   ```

   If prompted about replacing native files, review the changes before
   continuing. Do not edit generated native files as the source of truth;
   configure persistent native behavior in `app.json` or an Expo config
   plugin.

3. Install the iOS CocoaPods dependencies:

   ```bash
   npx pod-install ios
   ```

4. Open the CocoaPods workspace, not the `.xcodeproj` file:

   ```bash
   open ios/JomoRide.xcworkspace
   ```

5. In Xcode, select the `JomoRide` app target and configure **Signing &
   Capabilities**:

   - Select the Apple development team.
   - Confirm the bundle identifier is unique for the Apple team.
   - Enable automatic signing for a development or Ad Hoc export, or select
     the matching provisioning profile manually.
   - Select the `JomoRide` scheme.

6. To build a device IPA, select **Any iOS Device (arm64)** or a connected
   physical iPhone as the Xcode run destination. A simulator destination
   produces a simulator app and cannot be exported as a device `.ipa`.

7. Select **Product > Archive** in Xcode. Wait for the archive to finish; the
   Xcode Organizer opens with the new archive.

8. In Organizer, select the archive and choose **Distribute App**.

9. Select the distribution method required by the installation target:

   - **Development** for registered development devices.
   - **Ad Hoc** for registered devices outside the App Store.
   - **App Store Connect** for TestFlight or App Store submission.

10. Follow the signing prompts, choose **Automatically manage signing** when
    appropriate, and select **Export**. Xcode writes the exported `.ipa` into
    the directory selected in the export dialog.

11. Verify the generated artifact:

    ```bash
    file /path/to/exported/JomoRide.ipa
    ```

    For a physical device, install the exported IPA using Xcode Devices and
    Simulators, Apple Configurator, or the distribution channel selected in
    the previous step.

### Important build notes

- `npx expo start` and Expo Go load a JavaScript bundle; they do not create an
  installable device `.ipa`.
- `npx expo prebuild` creates native projects from the current JavaScript
  dependencies and Expo configuration. Re-run it after adding or removing a
  native module.
- The generated `ios/` directory is machine-generated and is not currently
  part of this repository. If native files are committed later, review the
  resulting signing and dependency changes before sharing the project.
- For a reproducible cloud build instead of local Xcode export, configure EAS
  Build and use an iOS build profile; that workflow manages archive creation
  remotely and is separate from this local Xcode process.
