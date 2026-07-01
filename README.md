# LifeOS — Cognitive Life & Performance Assistant

LifeOS is a sophisticated cognitive management cockpit powered by **J.A.R.V.I.S.** and **Piggy**, a self-verifying autonomous agent system. The application synchronizes daily tasks, habits, financial transactions, and strategic goals, leveraging AI telemetry to predict focus performance and prevent goal abandonment.

---

## 🏗️ Architectural Topology

LifeOS is structured as a decoupled, multi-layer service-oriented system designed for high reliability and strict type safety.

```mermaid
graph TD
    subgraph Client (Vite + React)
        UI[React UI Views] <--> Store[Zustand Global Store]
        Store <--> API[Axios HTTP Client]
    end

    subgraph Backend Server (Express + TS)
        API <--> Router[Thin Router Controller]
        Router <--> Services[Service Business Logic Layer]
        Services <--> DB[Database Service Repository]
        DB <--> Cache[Smart Memory Cache]
        DB <--> FS[(lifeos_db.json File System)]
    end

    subgraph Python Visual Cortex
        Router <--> Flask[Flask Video Analyzer]
        Flask <--> OpenCV[OpenCV Motion Tracker]
    end
```

### Key Modules:
- **Client (Frontend)**: Utilizes a central [Zustand Store](client/src/store/useStore.ts) to manage UI state, toast updates, transaction revert queues (Undo stack), and onboarding tours.
- **Controller Routes**: Exposes thin route controllers in [routes/](server/routes/) that map URLs, validate requests, and invoke services.
- **Service Domain Layer**: Business logic lives in [services/](server/services/) which execute all state checks, notifications alerts, and financial limits tracking.
- **Repository Layer**: The [db/index.ts](server/db/index.ts) repository interfaces directly with a thread-safe JSON file database and manages an in-memory [smartCache](server/db/cache.ts) to optimize read speeds.

---

## 🚀 Core Features

1. **J.A.R.V.I.S. Chat & Piggy AI**: Intelligent chat with contextual awareness of user tasks, habits, and budgets.
2. **Self-Verification Guardrails**: Every agent response is verified in real-time by a secondary validator assessing logical constraints, deadline conflicts, and budgeting limitations.
3. **TrackNet Visual Engine**: Real OpenCV tracking that analyzes contour motions in uploaded video frames and plots the centroid path on a visual dashboard coordinate grid.
4. **Interactive Welcome Tour**: Built-in step-by-step introduction component for onboarding new profiles.
5. **Universal Undo History**: Action history queue allowing users to instantly revert task completions or habit marks directly from toaster prompts.
6. **Data Portability**: Full JSON system state backup download and restore import endpoint.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)

### Installation & Run

1. **Install workspace dependencies**:
   ```bash
   # Root / Server
   npm install
   
   # Client
   cd client && npm install
   
   # Python visual cortex
   cd ../tracknet_engine && pip install -r requirements.txt
   ```

2. **Configure environment variable**:
   Create a `.env` file in the `server` directory:
   ```env
   PORT=5000
   GROQ_API_KEY=your_key_here
   ```

3. **Start backend & frontend**:
   ```bash
   # From workspace root
   npm run dev
   ```

---

## 🧪 Verification & Tests

The codebase includes automated tests validating the integrity of memory repositories and self-verifying analytical loops.

### Vitest Test Suite
Executes database service cache checks and goals assertion operations:
```bash
cd server && npm test
```

### Cognitive Loop Verification
Validates recommendations, verifiers, prediction telemetry models, and execution guards:
```bash
cd server && npx tsx testCognitiveArchitecture.ts
```
