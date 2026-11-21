"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  FileText,
  Headphones,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Upload,
  Volume2,
} from "lucide-react";
import {
  dashboardApi,
  type AudioBriefingResponse,
  type DocumentItem,
  type QuizResponse,
  type SynthesizedAudioTurn,
} from "@/lib/dashboard-api";

interface StudioWorkspacePanelProps {
  documents: DocumentItem[];
  activeDoc: DocumentItem | null;
  quizResult: QuizResponse | null;
  quizLoading: boolean;
  audioResult: AudioBriefingResponse | null;
  audioLoading: boolean;
  onSelectDoc: (docId: string) => void;
  onGenerateQuiz: (docId: string) => void;
  onGenerateAudio: (docId?: string) => void;
  onTriggerUpload: () => void;
}

export function StudioWorkspacePanel({
  documents,
  activeDoc,
  quizResult,
  quizLoading,
  audioResult,
  audioLoading,
  onSelectDoc,
  onGenerateQuiz,
  onGenerateAudio,
  onTriggerUpload,
}: StudioWorkspacePanelProps) {
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});

  // Podcast Audio Synthesis & Playback State (OpenAI gpt-4o-mini-tts / tts-1 + browser fallback)
  const [synthesizingAudio, setSynthesizingAudio] = useState(false);
  const [audioModelUsed, setAudioModelUsed] = useState<string | null>(null);
  const [synthesizedTurns, setSynthesizedTurns] = useState<SynthesizedAudioTurn[] | null>(null);
  const [useBrowserSpeech, setUseBrowserSpeech] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTurnIdx, setActiveTurnIdx] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.25 | 1.5>(1);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const speedRef = useRef(playbackSpeed);
  speedRef.current = playbackSpeed;

  const stopAllAudio = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.src = "";
      audioElRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Reset cached TTS audio & quiz answers when script/quiz regenerates
  useEffect(() => {
    stopAllAudio();
    setSynthesizedTurns(null);
    setAudioModelUsed(null);
    setUseBrowserSpeech(false);
    setActiveTurnIdx(0);
    setAudioError(null);
  }, [audioResult, stopAllAudio]);

  useEffect(() => {
    setQuizAnswers({});
  }, [quizResult]);

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, [stopAllAudio]);

  const playTurnAt = useCallback(
    (
      idx: number,
      turns: SynthesizedAudioTurn[],
      browserFallback: boolean
    ) => {
      if (idx < 0 || idx >= turns.length) {
        stopAllAudio();
        setActiveTurnIdx(0);
        return;
      }

      isPlayingRef.current = true;
      setIsPlaying(true);
      setActiveTurnIdx(idx);
      const turn = turns[idx];

      if (!browserFallback && turn.audio_base64) {
        if (audioElRef.current) {
          audioElRef.current.pause();
        }
        const el = new Audio(`data:audio/mpeg;base64,${turn.audio_base64}`);
        el.playbackRate = speedRef.current;
        audioElRef.current = el;
        el.onended = () => {
          if (isPlayingRef.current) {
            playTurnAt(idx + 1, turns, false);
          }
        };
        el.onerror = () => {
          if (isPlayingRef.current) {
            playTurnAt(idx + 1, turns, true);
          }
        };
        void el.play().catch(() => {
          setAudioError("Playback blocked by browser autoplay policy. Click Play again.");
          stopAllAudio();
        });
        return;
      }

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(turn.text);
        utter.rate = speedRef.current;
        utter.pitch = turn.speaker.toLowerCase().includes("alex") ? 0.94 : 1.08;
        utter.onend = () => {
          if (isPlayingRef.current) {
            playTurnAt(idx + 1, turns, browserFallback);
          }
        };
        window.speechSynthesis.speak(utter);
      } else {
        setAudioError("Audio playback is not supported in this browser.");
        stopAllAudio();
      }
    },
    [stopAllAudio]
  );

  const handleTogglePlay = async () => {
    if (!audioResult || audioResult.script.length === 0) return;
    if (isPlaying) {
      stopAllAudio();
      return;
    }
    setAudioError(null);

    if (synthesizedTurns && synthesizedTurns.length > 0) {
      playTurnAt(activeTurnIdx, synthesizedTurns, useBrowserSpeech);
      return;
    }

    setSynthesizingAudio(true);
    try {
      const res = await dashboardApi.synthesizeAudio({
        document_id: activeDoc?.id,
        title: audioResult.title,
        script: audioResult.script,
      });
      setSynthesizedTurns(res.segments);
      setAudioModelUsed(res.model_used);
      setUseBrowserSpeech(res.fallback_browser_tts);
      playTurnAt(activeTurnIdx, res.segments, res.fallback_browser_tts);
    } catch {
      const fallbackTurns: SynthesizedAudioTurn[] = audioResult.script.map((s) => ({
        speaker: s.speaker,
        voice: s.speaker.toLowerCase().includes("alex") ? "onyx" : "nova",
        text: s.text,
        source_chunk_id: s.source_chunk_id,
      }));
      setSynthesizedTurns(fallbackTurns);
      setAudioModelUsed("browser-speech");
      setUseBrowserSpeech(true);
      playTurnAt(activeTurnIdx, fallbackTurns, true);
    } finally {
      setSynthesizingAudio(false);
    }
  };

  const handleCycleSpeed = () => {
    const nextSpeed: 1 | 1.25 | 1.5 =
      playbackSpeed === 1 ? 1.25 : playbackSpeed === 1.25 ? 1.5 : 1;
    setPlaybackSpeed(nextSpeed);
    if (audioElRef.current) {
      audioElRef.current.playbackRate = nextSpeed;
    }
  };

  const answeredCount = quizResult
    ? quizResult.questions.filter((q) => Boolean(quizAnswers[q.question_id])).length
    : 0;
  const correctCount = quizResult
    ? quizResult.questions.filter(
        (q) => quizAnswers[q.question_id] === q.correct_option
      ).length
    : 0;

  return (
    <div className="db-studio-wrap">
      {/* Studio Active Document Scope Switcher */}
      {documents.length > 0 && (
        <div className="db-studio-scope-bar">
          <div className="db-studio-scope-label">
            <FileText size={13} />
            <span>Active Studio Source:</span>
          </div>
          <div className="db-studio-scope-pills">
            {documents.slice(0, 8).map((doc) => (
              <button
                key={doc.id}
                type="button"
                className={`db-studio-doc-pill ${
                  activeDoc?.id === doc.id ? "is-active" : ""
                }`}
                onClick={() => onSelectDoc(doc.id)}
              >
                {doc.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="db-homes-split db-studio-grid">
        {/* Left: Interactive Quiz Generator */}
        <div className="db-panel-box">
          <div className="db-panel-box-head">
            <div>
              <div className="db-panel-box-title">Interactive Quiz</div>
              <p className="db-panel-box-sub" style={{ margin: "2px 0 0" }}>
                Grounded comprehension checks with source page proof
              </p>
            </div>
            <div className="db-studio-head-actions">
              {quizResult && answeredCount > 0 && (
                <span className="db-quiz-score-pill">
                  Score {correctCount}/{quizResult.questions.length}
                </span>
              )}
              {quizResult && answeredCount > 0 && (
                <button
                  type="button"
                  className="db-mini-pill-btn"
                  title="Reset quiz answers"
                  onClick={() => setQuizAnswers({})}
                >
                  <RotateCcw size={11} />
                </button>
              )}
              <button
                type="button"
                className="db-mini-pill-btn db-mini-pill-btn--accent"
                disabled={!activeDoc || quizLoading}
                onClick={() => activeDoc && onGenerateQuiz(activeDoc.id)}
              >
                <BookOpen size={12} />
                <span>{quizLoading ? "Generating..." : "Generate"}</span>
              </button>
            </div>
          </div>

          {quizResult ? (
            <div className="db-quiz-list">
              {quizResult.questions.map((q, qIdx) => {
                const picked = quizAnswers[q.question_id];
                const isRight = picked === q.correct_option;
                return (
                  <div key={q.question_id} className="db-quiz-card">
                    <div className="db-quiz-q">
                      {qIdx + 1}. {q.question_text}
                    </div>
                    <div className="db-quiz-opts">
                      {q.options.map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          className={`db-quiz-opt ${
                            picked === opt.label
                              ? opt.label === q.correct_option
                                ? "db-quiz-opt--correct"
                                : "db-quiz-opt--wrong"
                              : picked && opt.label === q.correct_option
                              ? "db-quiz-opt--correct"
                              : ""
                          }`}
                          onClick={() =>
                            setQuizAnswers((prev) => ({
                              ...prev,
                              [q.question_id]: opt.label,
                            }))
                          }
                        >
                          <strong>{opt.label}.</strong> {opt.text}
                        </button>
                      ))}
                    </div>
                    {picked && (
                      <div className={`db-quiz-proof ${isRight ? "is-right" : ""}`}>
                        <CheckCircle2 size={12} />
                        <span>
                          Page {q.source_page}: {q.explanation}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="db-empty-dash-box">
              <BookOpen size={24} className="db-empty-icon" />
              <p>
                {activeDoc
                  ? `Generate a source-backed quiz from "${activeDoc.title}".`
                  : "Upload your first document to generate an interactive quiz."}
              </p>
              {!activeDoc && (
                <button
                  type="button"
                  className="db-mini-pill-btn db-mini-pill-btn--accent"
                  onClick={onTriggerUpload}
                >
                  <Upload size={12} />
                  <span>Start Upload</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Audio Briefing & OpenAI Cheap 2026 TTS Podcast Player */}
        <div className="db-panel-box">
          <div className="db-panel-box-head">
            <div>
              <div className="db-panel-box-title">Audio Briefing Studio</div>
              <p className="db-panel-box-sub" style={{ margin: "2px 0 0" }}>
                2-host podcast briefing powered by OpenAI gpt-4o-mini-tts
              </p>
            </div>
            <button
              type="button"
              className="db-mini-pill-btn db-mini-pill-btn--accent"
              disabled={!activeDoc || audioLoading}
              onClick={() => onGenerateAudio(activeDoc?.id)}
            >
              <Headphones size={12} />
              <span>{audioLoading ? "Writing..." : "Generate"}</span>
            </button>
          </div>

          {audioResult ? (
            <div className="db-audio-studio-body">
              <div className="db-studio-player">
                <div className="db-studio-player-controls">
                  <button
                    type="button"
                    className="db-studio-step-btn"
                    aria-label="Previous turn"
                    disabled={activeTurnIdx <= 0 || synthesizingAudio}
                    onClick={() => {
                      const turns =
                        synthesizedTurns ||
                        audioResult.script.map((s) => ({
                          speaker: s.speaker,
                          voice: s.speaker.toLowerCase().includes("alex")
                            ? "onyx"
                            : "nova",
                          text: s.text,
                        }));
                      playTurnAt(
                        Math.max(0, activeTurnIdx - 1),
                        turns,
                        useBrowserSpeech
                      );
                    }}
                  >
                    <SkipBack size={13} />
                  </button>

                  <button
                    type="button"
                    className="db-studio-play-btn"
                    disabled={synthesizingAudio}
                    onClick={() => void handleTogglePlay()}
                  >
                    {synthesizingAudio ? (
                      <Loader2 size={14} className="db-spin" />
                    ) : isPlaying ? (
                      <Pause size={14} />
                    ) : (
                      <Play size={14} />
                    )}
                    <span>
                      {synthesizingAudio
                        ? "Synthesizing Voice..."
                        : isPlaying
                        ? "Pause"
                        : "Play Podcast"}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="db-studio-step-btn"
                    aria-label="Next turn"
                    disabled={
                      activeTurnIdx >= audioResult.script.length - 1 ||
                      synthesizingAudio
                    }
                    onClick={() => {
                      const turns =
                        synthesizedTurns ||
                        audioResult.script.map((s) => ({
                          speaker: s.speaker,
                          voice: s.speaker.toLowerCase().includes("alex")
                            ? "onyx"
                            : "nova",
                          text: s.text,
                        }));
                      playTurnAt(
                        Math.min(turns.length - 1, activeTurnIdx + 1),
                        turns,
                        useBrowserSpeech
                      );
                    }}
                  >
                    <SkipForward size={13} />
                  </button>

                  <button
                    type="button"
                    className="db-studio-speed-btn"
                    onClick={handleCycleSpeed}
                    title="Adjust playback speed"
                  >
                    {playbackSpeed}x
                  </button>
                </div>

                <div className="db-studio-player-meta">
                  <span className="db-studio-engine-badge">
                    <Volume2 size={11} />
                    <span>{audioModelUsed || "gpt-4o-mini-tts ready"}</span>
                  </span>
                  <span className="db-panel-box-sub">
                    Turn {activeTurnIdx + 1}/{audioResult.script.length} ·{" "}
                    {audioResult.duration_estimate}
                  </span>
                </div>

                {audioError && <div className="db-studio-error">{audioError}</div>}
              </div>

              <div className="db-audio-script">
                {audioResult.script.map((turn, idx) => {
                  const speakingNow = (isPlaying || synthesizedTurns) && activeTurnIdx === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`db-audio-turn ${speakingNow ? "is-speaking" : ""}`}
                      onClick={() => {
                        if (synthesizedTurns) {
                          playTurnAt(idx, synthesizedTurns, useBrowserSpeech);
                        } else {
                          setActiveTurnIdx(idx);
                        }
                      }}
                    >
                      <span className="db-audio-speaker">{turn.speaker}:</span>{" "}
                      <span>{turn.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="db-empty-dash-box">
              <Headphones size={24} className="db-empty-icon" />
              <p>
                {activeDoc
                  ? `Generate a 2-host audio briefing for "${activeDoc.title}" and play it with OpenAI Voice.`
                  : "Upload a document to create a 2-host spoken podcast briefing."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
