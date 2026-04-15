# Special Report: Engineering Challenges & Technical Hurdles
## A Documentation of Obstacles, Pivots, and Solutions
**Project:** AI Interview Bot Lifecycle
**Reporting Period:** August 2025 – January 2026

---

## 1. Introduction
Building an AI-native, real-time proctored interview system presents unique challenges that span from low-level browser API constraints to high-level AI orchestration. This report categorizes the primary hurdles faced by the engineering team and details the specific strategies used to overcome them.

---

## 2. AI & LLM Orchestration Challenges

### 2.1 The "Generic Feedback" Problem
- **The Challenge**: Initial tests with GPT-4 resulted in interview feedback that was too polite and generic (e.g., "Good answer!"). This wasn't helpful for recruiters looking for specific competency gaps.
- **The Pivot**: We moved from simple prompts to **Structured Rubric Prompting**. We injected specific competency names (e.g., "Logical Structuring") into the system instructions.
- **The Solution**: The AI now generates a structured JSON object for every response, forcing it to provide numeric scores and critical, evidence-based feedback.

### 2.2 Token Management and "Hallucinations"
- **The Challenge**: When resumes were too long, we hit token limits, which led the AI to "hallucinate" or skip important sections of the candidate's experience.
- **The Solution**: Implemented a **Resume Context Windowing** technique. The system now parses the resume into segments (Skills, Work History, Education) and only sends relevant segments to the LLM based on the current interview stage.

### 2.3 API Rate Limiting (Free Tier Constraints)
- **The Challenge**: During early development, Azure/OpenAI free tier limits often stalled testing, particularly when conducting long 15-question interviews.
- **The Solution**: We built an **Intelligent Caching Layer** and implemented exponential backoff in the `ai_engine.py`. This ensured that if an API call failed due to rate limits, the system would gracefully retry without crashing the candidate's session.

---

## 3. Real-Time Media & Proctoring Hurdles

### 3.1 Video & Screen Sharing Resource Conflict
- **The Challenge**: Browsers often struggle to manage two high-definition media streams (Webcam + Screen) simultaneously, leading to frame drops or permission errors where the camera would stop when screen sharing began.
- **The Solution**: We re-architected the `handleCameraSetupComplete` function in the frontend. We now request the Screen stream first, wait for confirmation, and then re-acquire the Webcam stream with a slight delay (800ms) to allow the browser's hardware encoder to reset.

### 3.2 Permission Prompt Fatigue
- **The Challenge**: If a candidate denied any one of the three permissions (Mic, Camera, or Screen), the interview would enter a broken state.
- **The Solution**: Created a dedicated **Pre-Flight Check Module**. Candidates must pass a "Permission Checklist" with visual feedback before the interview session even initializes in the backend.

### 3.3 Integrity Enforcement (The Fullscreen Battle)
- **The Challenge**: Browser security models make it difficult to "force" fullscreen. Users can easily escape, and programmatic re-entry is restricted.
- **The Solution**: We implemented a **State-Based Lockout**. If a user exits fullscreen, a high-priority overlay covers the entire chat interface, effectively "pausing" the interview until they re-enable fullscreen.

---

## 4. Frontend Engineering & UX Consistency

### 4.1 React Hydration Mismatches (SSR Issues)
- **The Challenge**: The `AudioWaveform` component used random heights for its bars. Next.js would generate one set of heights on the server and another on the client, causing a "Hydration Error" and breaking the page.
- **The Solution**: We utilized the `mount` state pattern. The waveform now renders a "skeleton" bar on the server and only initializes the dynamic, interactive SVG once the component is mounted on the client.

### 4.2 Tailwind CSS Utility Errors
- **The Challenge**: During the transition to a premium UI, unknown utility classes like `bg-background` caused PostCSS errors in the build pipeline.
- **The Solution**: We audit the `tailwind.config.js` to ensure all custom tokens are correctly mapped to the HSL/RGB values used in our "Glassmorphism" theme.

---

## 5. Security & Cross-Origin Messaging

### 5.1 Extension-to-Backend CORS Hurdles
- **The Challenge**: Chrome Extensions operate under a unique `chrome-extension://` origin, which is normally blocked by standard CORS policies.
- **The Solution**: We configured a dynamic `CORSMiddleware` in FastAPI that identifies the specific Extension ID and allows it as a trusted origin, while still blocking other unauthorized requests.

### 5.2 Session Persistence via JWT
- **The Challenge**: If a candidate refreshed their page mid-interview, all progress would be lost.
- **The Solution**: We migrated the session state to **HTTP-Only Cookies**. This keeps the JWT secure from XSS attacks while allowing the backend to immediately restore the session state (`currentQuestion`, `currentStage`) upon page reload.

---

## 6. Summary of Engineering Prowess
The development of the AI Interview Bot was a constant balance between **User Privacy**, **System Integrity**, and **AI Accuracy**. By treating every challenge as an architectural opportunity, we have built a system that is not only functional but resilient to the messy reality of real-world internet connections and browser constraints.

---
**REPORT CONCLUDED**
