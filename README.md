# ShareWave — P2P File Sharing Web Application

A modern, lightweight, privacy-focused peer-to-peer file sharing application inspired by AirDrop, Snapdrop, and Sharedrop.

Share files directly between browsers on Android, iOS, Windows, macOS, and Linux without uploading to a central server, installing an app, or creating an account.

---

## 🌟 Highlights

- **Direct WebRTC DataChannels**: Files stream directly device-to-device with DTLS encryption.
- **Zero Cloud Storage**: No files or chunks are ever uploaded to Firebase, Cloudflare, or any server.
- **No Registration**: Anonymous Firebase Authentication provides seamless, transient identity without logins.
- **Room Lifecycle**: Rooms use 128-bit cryptographically secure IDs, 2-hour TTLs, and automatic presence heartbeats.
- **Chunked Transfer & Backpressure**: 64 KiB chunks with bufferedAmount monitoring to prevent memory exhaustion on large files.
- **Streaming & Progressive Saving**: Uses File System Access API (`showSaveFilePicker`) where available with safe in-memory fallback.
- **Mobile-First AirDrop UI**: Minimalist, responsive UI built with Tailwind CSS, Lucide icons, and light/dark theme support.
- **Cloudflare Pages Ready**: Zero-cost hosting with SPA redirects configured.

---

## 🏗️ System Architecture

```
                    ┌─────────────────────────┐
                    │    Firebase Firestore   │
                    │   (Signaling & Rooms)   │
                    └───────────┬─────────────┘
                                │
                 SDP Offer / Answer & ICE Candidates
                                │
               ┌────────────────┴────────────────┐
               ▼                                 ▼
     ┌──────────────────┐               ┌──────────────────┐
     │  Sender Device   │               │ Receiver Device  │
     │ (Browser WebRTC) │◄─────────────►│ (Browser WebRTC) │
     └──────────────────┘  RTCDataChannel  └──────────────────┘
                           Direct Binary
                           File Chunks
                           (64 KiB)
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (tested with Node.js 20/22/26)
- npm 9+
- A Firebase project with Firestore and Anonymous Authentication enabled

### 1. Clone & Install

```bash
git clone https://github.com/mrsid96/share.git
cd share
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Populate the `.env` file with your Firebase web configuration:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef...
```

### 3. Configure Firebase Console

1. **Enable Anonymous Authentication**:
   - Go to [Firebase Console](https://console.firebase.google.com/) > **Authentication** > **Sign-in method**.
   - Enable **Anonymous**.

2. **Deploy Firestore Security Rules**:
   - In Firebase Console > **Firestore Database** > **Rules**, paste the contents of `firestore.rules`.
   - Or deploy via Firebase CLI:
     ```bash
     firebase deploy --only firestore:rules
     ```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing

### Unit & Integration Tests

Run the full Vitest suite (41 tests):

```bash
npm test
```

### Type Checking & Production Build

```bash
npm run build
```

### End-to-End Tests

```bash
npx playwright install chromium
npm run test:e2e
```

---

## ☁️ Deployment (Cloudflare Pages)

1. Connect your GitHub repository to [Cloudflare Pages](https://pages.cloudflare.com/).
2. Build settings:
   - **Framework preset**: None / Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
3. Add Environment Variables in Cloudflare Pages dashboard matching `.env.example`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
4. Deploy! The included `public/_redirects` ensures SPA client-side routing works for all URLs.

---

## 🔒 Security & Privacy

- **No Server File Storage**: Binary file data never touches Firebase or Cloudflare.
- **Strict Firestore Rules**: All writes require authenticated anonymous sessions. Members can only read rooms they belong to and write their own presence.
- **Explicit Consent**: Incoming transfers always require user confirmation before starting the transfer.
- **Sanitized Filenames**: Paths are scrubbed of directory traversal characters (`..`, `/`, `\`).
- **Encrypted Transport**: WebRTC DataChannels are encrypted by default via DTLS.

---

## 📁 Project Structure

```
├── public/
│   ├── _redirects             # Cloudflare Pages SPA routing
│   ├── favicon.svg            # ShareWave logo
│   └── icons/
├── src/
│   ├── app/
│   │   ├── App.tsx            # Root component with error boundary
│   │   ├── providers.tsx      # System theme provider
│   │   └── router.tsx         # React Router v7 configuration
│   ├── components/
│   │   ├── devices/           # DeviceCard, DeviceList
│   │   ├── files/             # FileDropZone
│   │   ├── layout/            # AppShell, theme toggle
│   │   ├── transfers/         # IncomingTransferSheet, TransferProgress, CompletedTransfer
│   │   └── ui/                # Button, Card, Badge, Modal, Progress
│   ├── features/
│   │   └── rooms/             # HomeScreen, RoomScreen
│   ├── hooks/
│   │   ├── useAuth.ts         # Anonymous auth lifecycle
│   │   ├── useRoom.ts         # Presence, heartbeat, membership
│   │   └── useTransfer.ts     # P2P transfer orchestrator
│   ├── services/
│   │   ├── file-system/       # Chunking, progressive file writing
│   │   ├── firebase/          # Auth & Firestore signaling
│   │   └── webrtc/            # PeerConnection & FileTransfer protocol
│   ├── store/                 # Zustand stores (auth, room, transfer)
│   ├── types/                 # Strict TypeScript contracts
│   └── utils/                 # Random IDs, formatters, sanitizers
├── tests/
│   ├── unit/                  # Formatting, IDs, validation, chunking
│   ├── integration/           # Store state transitions
│   └── e2e/                   # Two-browser context transfer flows
├── firestore.rules            # Granular security rules
├── wrangler.toml              # Cloudflare configuration
└── vite.config.ts             # Vite + Tailwind + Vitest
```
