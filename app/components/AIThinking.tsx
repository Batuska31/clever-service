"use client"

import type { CSSProperties } from "react"
import { motion } from "framer-motion"

type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "done" | "error"

interface AIThinkingProps {
  onActivate?: () => void
  onStop?: () => void
  isActive?: boolean
  size?: number
  state?: VoiceState
  transcript?: string
}

const STATE_META: Record<VoiceState, { label: string; helper: string; tone: string }> = {
  idle: {
    label: "Ready",
    helper: "Tap the mic to start the holo listening layer.",
    tone: "#4a90e2",
  },
  listening: {
    label: "Listening",
    helper: "Voice input is flowing through the holographic capture field.",
    tone: "#ffc107",
  },
  thinking: {
    label: "Thinking",
    helper: "Command context is being resolved into an answer.",
    tone: "#ff9b2f",
  },
  speaking: {
    label: "Speaking",
    helper: "Response is streaming back with voice playback enabled.",
    tone: "#6ac7ff",
  },
  done: {
    label: "Ready again",
    helper: "You can restart listening or push the transcript into chat.",
    tone: "#ffffff",
  },
  error: {
    label: "Mic issue",
    helper: "Check browser permissions and available audio input.",
    tone: "#ff6b81",
  },
}

const WAVE_SHAPES: Record<VoiceState, [string, string, string]> = {
  idle: [
    "M0 110 C80 110 120 110 160 110 C220 110 260 110 320 110 C390 110 430 110 480 110 C540 110 590 110 640 110",
    "M0 110 C80 110 120 108 160 110 C220 112 260 108 320 110 C390 112 430 108 480 110 C540 112 590 110 640 110",
    "M0 110 C80 110 120 110 160 110 C220 110 260 110 320 110 C390 110 430 110 480 110 C540 110 590 110 640 110",
  ],
  listening: [
    "M0 110 C60 110 100 176 148 176 C196 176 218 42 284 42 C350 42 374 174 442 174 C510 174 548 110 640 110",
    "M0 110 C64 110 100 164 152 164 C204 164 222 56 286 56 C350 56 376 166 444 166 C512 166 552 110 640 110",
    "M0 110 C60 110 96 182 150 182 C204 182 226 38 288 38 C350 38 380 178 446 178 C512 178 552 110 640 110",
  ],
  thinking: [
    "M0 110 C58 110 100 150 156 150 C212 150 228 74 292 74 C356 74 376 146 444 146 C512 146 556 110 640 110",
    "M0 110 C62 110 98 144 154 144 C210 144 232 82 296 82 C360 82 382 142 448 142 C514 142 554 110 640 110",
    "M0 110 C58 110 96 154 156 154 C216 154 230 68 294 68 C358 68 382 150 448 150 C514 150 556 110 640 110",
  ],
  speaking: [
    "M0 110 C60 110 104 160 150 160 C196 160 226 60 286 60 C346 60 378 156 444 156 C510 156 548 94 640 94",
    "M0 110 C64 110 104 144 156 144 C208 144 230 78 292 78 C354 78 382 152 446 152 C510 152 548 98 640 98",
    "M0 110 C60 110 102 168 154 168 C206 168 230 54 288 54 C346 54 380 164 444 164 C508 164 548 92 640 92",
  ],
  done: [
    "M0 110 C80 110 120 108 160 110 C220 112 260 108 320 110 C390 112 430 108 480 110 C540 112 590 110 640 110",
    "M0 110 C80 110 120 106 160 110 C220 114 260 106 320 110 C390 114 430 106 480 110 C540 114 590 110 640 110",
    "M0 110 C80 110 120 108 160 110 C220 112 260 108 320 110 C390 112 430 108 480 110 C540 112 590 110 640 110",
  ],
  error: [
    "M0 110 C72 110 112 132 162 132 C212 132 246 88 298 88 C350 88 388 134 448 134 C508 134 552 110 640 110",
    "M0 110 C72 110 110 126 162 126 C214 126 244 94 298 94 C352 94 390 128 448 128 C506 128 552 110 640 110",
    "M0 110 C72 110 112 132 162 132 C212 132 246 88 298 88 C350 88 388 134 448 134 C508 134 552 110 640 110",
  ],
}

export function AIThinking({
  onActivate,
  onStop,
  isActive = false,
  size = 92,
  state = "idle",
  transcript = "",
}: AIThinkingProps) {
  const active = isActive || state !== "idle"
  const meta = STATE_META[state]
  const waves = WAVE_SHAPES[state]

  return (
    <div
      className={`ai-voice ai-voice-${state}`}
      style={{ "--voice-size": `${size}px`, "--voice-tone": meta.tone } as CSSProperties}
    >
      <div className="ai-voice-console">
        <div className="ai-voice-console-top">
          <div className="ai-voice-badge">
            <span className="ai-voice-badge-dot" />
            {meta.label}
          </div>
          <button
            type="button"
            className="ai-voice-console-button"
            onClick={() => {
              if (active) onStop?.()
              else onActivate?.()
            }}
          >
            {active ? "Stop" : "Start"}
          </button>
        </div>

        <div className="ai-voice-wavefield">
          <motion.div
            className="ai-voice-scan"
            animate={{ x: ["-10%", "110%"] }}
            transition={{ duration: active ? 2.2 : 3.8, repeat: Infinity, ease: "linear" }}
          />

          <svg className="ai-voice-svg glow" viewBox="0 0 640 220" aria-hidden="true">
            <motion.path
              d={waves[0]}
              animate={{ d: waves }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
          </svg>
          <svg className="ai-voice-svg cyan" viewBox="0 0 640 220" aria-hidden="true">
            <motion.path
              d={waves[1]}
              animate={{ d: [waves[1], waves[2], waves[0], waves[1]] }}
              transition={{ duration: 2.7, repeat: Infinity, ease: "easeInOut" }}
            />
          </svg>
          <svg className="ai-voice-svg white" viewBox="0 0 640 220" aria-hidden="true">
            <motion.path
              d={waves[2]}
              animate={{ d: [waves[2], waves[0], waves[1], waves[2]] }}
              transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
            />
          </svg>

          <div className="ai-voice-core">
            <motion.div
              className="ai-voice-core-ring"
              animate={{ scale: active ? [1, 1.12, 1] : 1, opacity: active ? [0.45, 0.9, 0.45] : 0.35 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="ai-voice-core-dot">
              <svg
                className="ai-voice-mic"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
                <path d="M19 11v1a7 7 0 0 1-14 0v-1" />
                <path d="M12 19v3" />
              </svg>
            </div>
          </div>
        </div>

        <div className="ai-voice-console-bottom">
          <span>{meta.helper}</span>
          <p>{transcript || "Voice transcript will appear here while the holo field is active."}</p>
        </div>
      </div>
    </div>
  )
}
