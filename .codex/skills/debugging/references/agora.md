# 🎙️ Agora Conversational AI & RTC Diagnostic Reference

This reference guide details systematic root cause analysis, diagnostic triage, defect isolation, and automated verification procedures for **Agora Conversational AI Engine**, **Agora RTC/RTM SDKs**, and voice agent pipelines.

---

## 1. Diagnostic Event Taxonomy & Failure Timeline

When diagnosing agent session termination or speech pipeline failures, construct the failure timeline by correlating webhook events and client callbacks:

```
┌───────────────────────────┐
│ 101: Agent Joined         │  Confirm session initialization & channel subscription
└─────────────┬─────────────┘
              │
┌─────────────▼─────────────┐
│ 111: Agent Metrics        │  Inspect latency trends (ASR delay, LLM TTFT, TTS latency)
└─────────────┬─────────────┘
              │
┌─────────────▼─────────────┐
│ 110: Agent Error          │  Identify failing module (llm, tts, asr, sip, rtc) & turn_id
└─────────────┬─────────────┘
              │
┌─────────────▼─────────────┐
│ 102: Agent Left           │  Inspect termination status & exit reason message
└───────────────────────────┘
```

### Event Codes Reference Table

| Event Code | Event Name | Functional Purpose | Key Diagnostic Fields |
|---|---|---|---|
| **`101`** | `agent joined` | Confirms agent successfully connected to the RTC channel. | `agent_id`, `channel`, `agent_rtc_uid`, `start_ts` |
| **`102`** | `agent left` | Explains how and why the agent session terminated. | `status`, `message` (e.g. `idle_timeout`, `force_stopped`), `stop_ts` |
| **`104`** | `agent expire` | Indicates token or session expiration without renewal. | `agent_id`, `expire_ts` |
| **`110`** | `agent error` | Module-level failure during active conversation. | `errors[].module` (`llm`\|`tts`\|`asr`\|`sip`), `errors[].code`, `errors[].message`, `turn_id` |
| **`111`** | `agent metrics` | Performance & latency telemetry for speech turns. | `metrics.asr_delay`, `metrics.llm_ttft`, `metrics.tts_latency`, `turn_id` |

---

## 2. Client & Server Callback Inspection

### Client-Side Callbacks
```typescript
// Listen for agent failure & state changes in client SDK
agent.on('onAgentError', (error) => {
  console.error('[Agora Agent Error]', error.code, error.message, 'Turn:', error.turn_id);
});

agent.on('onAgentStateChanged', (state) => {
  // States: IDLE, LISTENING, THINKING, SPEAKING
  console.log('[Agent State Transition]', state);
});

agent.on('onDebugLog', (log) => {
  console.debug('[Agora Debug Log]', log);
});
```

### Server-Side Turn-Level Analysis (REST API)
When a failure occurs on a specific dialogue turn, query the conversation turn history:

```bash
# Query turn-level timing, transcripts, and model completions
curl -X GET \
  "https://api.agora.io/api/conversational-ai-agent/v2/projects/{APP_ID}/agents/{AGENT_ID}/turns" \
  -H "Authorization: Basic <BASE64_CREDENTIALS>" \
  -H "Content-Type: application/json"
```

---

## 3. Common Defect Patterns & Remediation

### A. Authentication & Dynamic Token Errors
- **Symptom**: Client or agent fails to join channel (`ERR_TOKEN_EXPIRED` or code `109` / `110`).
- **Root Cause**: Expired token timestamp, mismatched App ID / App Certificate, or UID mismatch between token generator and join request.
- **Remediation**:
  1. Generate RTC token with matching `channelName`, `uid`, and appropriate `expireTimestamp` (e.g. 24h for development).
  2. If using String UIDs, ensure `enable_string_uid: true` is configured uniformly across client and backend agent join request.

### B. Module API Failures (ASR / LLM / TTS Modules)
- **Symptom**: Agent joins the channel but remains silent or disconnects after user speaks.
- **Diagnostic Triage**: Inspect `110 agent error` payload:
  - `module: "llm"` $\rightarrow$ Verify LLM API key (if BYOK mode), model quota/rate limits (HTTP 429), or invalid JSON schema in function/tool calling.
  - `module: "tts"` $\rightarrow$ Check voice ID validity, audio format compatibility, or TTS vendor connectivity.
  - `module: "asr"` $\rightarrow$ Check language code (`language: "en-US"`), audio stream codec, or sample rate (16kHz / 48kHz).
- **Managed Mode Switch**: Set `credential_mode: "managed"` in ASR, LLM, and TTS configurations to isolate vendor credential issues.

### C. Audio Pipeline & Echo Feedback Loop
- **Symptom**: Agent interrupts itself, hears its own echo, or user audio is choppy.
- **Root Cause**: Inadequate Acoustic Echo Cancellation (AEC) or wrong audio scenario profile.
- **Remediation**:
  1. Set Agora audio profile to high quality: `client.setAudioProfile('speech_standard')` or `music_standard`.
  2. Enable browser echo cancellation: `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })`.
  3. Ensure the AI agent is assigned a distinct `agent_rtc_uid` (e.g. `'0'` or dedicated UID) that differs from the user's `remote_rtc_uids`.

### D. Browser Autoplay & Audio Capture Restriction
- **Symptom**: `DOMException: play() failed because the user didn't interact with the document first`.
- **Remediation**: Require an explicit user interaction (e.g., "Start Conversation" button click) before calling `rtcEngine.join()` and initializing remote audio track playback.

---

## 4. Agora CLI Diagnostics

Run the Agora CLI diagnostic commands to rapidly verify project configuration and credentials:

```powershell
# 1. Inspect active project health & Conversational AI feature readiness
agora project doctor --feature convoai

# 2. Verify exported environment variables & credentials
agora project env --format shell --with-secrets

# 3. Check active project binding
agora project use <project-name>
```

---

## 5. Verification Commands

```bash
# Verify environment readiness via Agora CLI
agora project doctor

# Run project test suites & build validation
npm test
npm run build
```
