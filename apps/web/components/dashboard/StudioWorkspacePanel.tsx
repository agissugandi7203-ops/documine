"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
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
  XCircle,
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
  onGenerateQuiz: (docId: string, numQuestions?: number) => void;
  onGenerateAudio: (docId?: string, style?: string) => void;
  onTriggerUpload: () => void;
}

const STORY_VOICES = [
  { id: "marin", label: "Marin", note: "Natural & Clear" },
  { id: "coral", label: "Coral", note: "Warm & Friendly" },
  { id: "sage", label: "Sage", note: "Calm & Articulate" },
  { id: "cedar", label: "Cedar", note: "Rich & Smooth" },
  { id: "ballad", label: "Ballad", note: "Expressive" },
  { id: "ash", label: "Ash", note: "Documentary" },
] as const;

const STORY_STYLES = [
  { id: "storytelling", label: "Storytelling" },
  { id: "documentary", label: "Documentary" },
  { id: "executive", label: "Executive Narrative" },
] as const;

const QUIZ_COUNTS = [3, 5, 8] as const;

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
  // Interactive Step-by-Step Quiz State
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [currentQuizIdx, setCurrentQuizIdx] = useState<number>(0);
  const [draftSelection, setDraftSelection] = useState<Record<string, string>>({});
  const [lockedAnswers, setLockedAnswers] = useState<Record<string, string>>({});
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false);

  // Storytelling Audio State
  const [storyStyle, setStoryStyle] = useState<string>("storytelling");
  const [selectedVoice, setSelectedVoice] = useState<string>("marin");
  const [synthesizingAudio, setSynthesizingAudio] = useState(false);
  const [audioModelUsed, setAudioModelUsed] = useState<string | null>(null);
  const [synthesizedTurns, setSynthesizedTurns] = useState<SynthesizedAudioTurn[] | null>(null);
  const [synthesizedVoiceKey, setSynthesizedVoiceKey] = useState<string | null>(null);
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

  useEffect(() => {
    stopAllAudio();
    setSynthesizedTurns(null);
    setSynthesizedVoiceKey(null);
    setAudioModelUsed(null);
    setUseBrowserSpeech(false);
    setActiveTurnIdx(0);
    setAudioError(null);
  }, [audioResult, stopAllAudio]);

  useEffect(() => {
    setCurrentQuizIdx(0);
    setDraftSelection({});
    setLockedAnswers({});
    setQuizCompleted(false);
  }, [quizResult]);

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, [stopAllAudio]);

  const handleResetQuiz = () => {
    setCurrentQuizIdx(0);
    setDraftSelection({});
    setLockedAnswers({});
    setQuizCompleted(false);
  };

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
          setAudioError("Playback paused by browser policy. Click Play Story again.");
          stopAllAudio();
        });
        return;
      }

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(turn.text);
        utter.rate = speedRef.current;
        utter.pitch = 1.0;
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

  const synthesizeAndPlayAt = async (startIdx: number, voiceOverride?: string) => {
    if (!audioResult || audioResult.script.length === 0) return;
    const targetVoice = voiceOverride || selectedVoice;
    setAudioError(null);

    if (
      synthesizedTurns &&
      synthesizedTurns.length > 0 &&
      synthesizedVoiceKey === targetVoice
    ) {
      playTurnAt(startIdx, synthesizedTurns, useBrowserSpeech);
      return;
    }

    setSynthesizingAudio(true);
    try {
      const res = await dashboardApi.synthesizeAudio({
        document_id: activeDoc?.id,
        title: audioResult.title,
        voice: targetVoice,
        style: storyStyle,
        script: audioResult.script,
      });
      setSynthesizedTurns(res.segments);
      setSynthesizedVoiceKey(targetVoice);
      setAudioModelUsed(res.model_used);
      setUseBrowserSpeech(res.fallback_browser_tts);
      playTurnAt(startIdx, res.segments, res.fallback_browser_tts);
    } catch {
      const fallbackTurns: SynthesizedAudioTurn[] = audioResult.script.map((s) => ({
        speaker: s.speaker,
        voice: targetVoice,
        text: s.text,
        source_chunk_id: s.source_chunk_id,
      }));
      setSynthesizedTurns(fallbackTurns);
      setSynthesizedVoiceKey(targetVoice);
      setAudioModelUsed("browser-speech");
      setUseBrowserSpeech(true);
      playTurnAt(startIdx, fallbackTurns, true);
    } finally {
      setSynthesizingAudio(false);
    }
  };

  const handleTogglePlay = async () => {
    if (!audioResult || audioResult.script.length === 0) return;
    if (isPlaying) {
      stopAllAudio();
      return;
    }
    await synthesizeAndPlayAt(activeTurnIdx);
  };

  const handleSelectVoice = (voiceId: string) => {
    stopAllAudio();
    setSelectedVoice(voiceId);
    setSynthesizedTurns(null);
    setSynthesizedVoiceKey(null);
    setAudioModelUsed(null);
  };

  const handleCycleSpeed = () => {
    const nextSpeed: 1 | 1.25 | 1.5 =
      playbackSpeed === 1 ? 1.25 : playbackSpeed === 1.25 ? 1.5 : 1;
    setPlaybackSpeed(nextSpeed);
    if (audioElRef.current) {
      audioElRef.current.playbackRate = nextSpeed;
    }
  };

  const questions = quizResult?.questions || [];
  const totalQuestions = questions.length;
  const activeQuestion = questions[currentQuizIdx] || null;
  const lockedCount = questions.filter((q) => Boolean(lockedAnswers[q.question_id])).length;
  const correctCount = questions.filter(
    (q) => lockedAnswers[q.question_id] === q.correct_option
  ).length;
  const scorePct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return (
    <div className="db-studio-wrap">
      {/* Studio Active Document Scope Switcher */}
      {documents.length > 0 && (
        <div className="db-studio-scope-bar">
          <div className="db-studio-scope-label">
            <FileText size={14} />
            <span>Active Source Document:</span>
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
        {/* Left: Interactive Step-by-Step Quiz Runner */}
        <div className="db-panel-box db-studio-card">
          <div className="db-panel-box-head db-studio-card-head">
            <div>
              <div className="db-panel-box-title">Interactive Comprehension Quiz</div>
              <p className="db-panel-box-sub" style={{ margin: "4px 0 0" }}>
                Fast step-by-step practice with locked answers and page citations
              </p>
            </div>
            <div className="db-studio-head-actions">
              <div className="db-studio-seg-group" role="group" aria-label="Question count">
                {QUIZ_COUNTS.map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    className={`db-studio-seg-btn ${
                      questionCount === cnt ? "is-active" : ""
                    }`}
                    onClick={() => setQuestionCount(cnt)}
                    disabled={quizLoading}
                  >
                    {cnt}Q
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="db-mini-pill-btn db-mini-pill-btn--accent"
                disabled={!activeDoc || quizLoading}
                onClick={() => activeDoc && onGenerateQuiz(activeDoc.id, questionCount)}
              >
                {quizLoading ? (
                  <Loader2 size={12} className="db-spin" />
                ) : (
                  <BookOpen size={12} />
                )}
                <span>{quizLoading ? "Building..." : quizResult ? "New Quiz" : "Start Quiz"}</span>
              </button>
            </div>
          </div>

          {quizLoading ? (
            <div className="db-studio-loading-box">
              <Loader2 size={22} className="db-spin" />
              <strong>Creating {questionCount} interactive questions...</strong>
              <span>Sampling verified passages from {activeDoc?.title || "your document"}</span>
            </div>
          ) : quizResult && totalQuestions > 0 ? (
            quizCompleted ? (
              <div className="db-quiz-summary-view">
                <div className="db-quiz-score-banner">
                  <div className="db-quiz-score-badge">
                    <Award size={22} />
                    <span>{scorePct}%</span>
                  </div>
                  <div className="db-quiz-score-copy">
                    <strong>
                      You scored {correctCount} out of {totalQuestions}
                    </strong>
                    <span>
                      {scorePct >= 80
                        ? "Strong command of the source material."
                        : scorePct >= 50
                        ? "Good progress. Review the highlighted explanations below."
                        : "Review the cited source pages below and try another round."}
                    </span>
                  </div>
                  <div className="db-quiz-summary-actions">
                    <button
                      type="button"
                      className="db-mini-pill-btn"
                      onClick={handleResetQuiz}
                    >
                      <RotateCcw size={12} />
                      <span>Retake</span>
                    </button>
                    <button
                      type="button"
                      className="db-mini-pill-btn db-mini-pill-btn--accent"
                      disabled={!activeDoc}
                      onClick={() => activeDoc && onGenerateQuiz(activeDoc.id, questionCount)}
                    >
                      <BookOpen size={12} />
                      <span>New Questions</span>
                    </button>
                  </div>
                </div>

                <div className="db-quiz-review-list">
                  {questions.map((q, idx) => {
                    const userAns = lockedAnswers[q.question_id];
                    const isRight = userAns === q.correct_option;
                    const chosenOpt = q.options.find((o) => o.label === userAns);
                    const rightOpt = q.options.find((o) => o.label === q.correct_option);
                    return (
                      <div
                        key={q.question_id}
                        className={`db-quiz-review-item ${isRight ? "is-right" : "is-wrong"}`}
                      >
                        <div className="db-quiz-review-top">
                          <span className="db-quiz-review-num">Q{idx + 1}</span>
                          <span className="db-quiz-review-q">{q.question_text}</span>
                          <span className="db-quiz-page-chip">Page {q.source_page}</span>
                        </div>
                        <div className="db-quiz-review-ans">
                          <span>
                            Your answer: <strong>{userAns || "-"}. {chosenOpt?.text || "Skipped"}</strong>
                          </span>
                          {!isRight && rightOpt && (
                            <span>
                              Correct: <strong>{rightOpt.label}. {rightOpt.text}</strong>
                            </span>
                          )}
                        </div>
                        <p className="db-quiz-review-exp">{q.explanation}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : activeQuestion ? (
              <div className="db-quiz-runner">
                <div className="db-quiz-progress-head">
                  <span className="db-quiz-step-label">
                    Question {currentQuizIdx + 1} of {totalQuestions}
                  </span>
                  <span className="db-quiz-score-pill">
                    Score {correctCount}/{lockedCount}
                  </span>
                </div>
                <div className="db-quiz-progress-bar" aria-hidden="true">
                  <div
                    className="db-quiz-progress-fill"
                    style={{
                      width: `${Math.round(((currentQuizIdx + 1) / totalQuestions) * 100)}%`,
                    }}
                  />
                </div>

                <div className="db-quiz-stage-card">
                  <div className="db-quiz-q">{activeQuestion.question_text}</div>

                  <div className="db-quiz-opts">
                    {activeQuestion.options.map((opt) => {
                      const locked = lockedAnswers[activeQuestion.question_id];
                      const selected =
                        locked || draftSelection[activeQuestion.question_id];
                      const isPicked = selected === opt.label;
                      const isCorrectOpt = opt.label === activeQuestion.correct_option;

                      let stateClass = "";
                      if (locked) {
                        if (isCorrectOpt) {
                          stateClass = "db-quiz-opt--correct";
                        } else if (isPicked) {
                          stateClass = "db-quiz-opt--wrong";
                        }
                      } else if (isPicked) {
                        stateClass = "db-quiz-opt--selected";
                      }

                      return (
                        <button
                          key={opt.label}
                          type="button"
                          disabled={Boolean(locked)}
                          className={`db-quiz-opt ${stateClass}`}
                          onClick={() => {
                            if (locked) return;
                            setDraftSelection((prev) => ({
                              ...prev,
                              [activeQuestion.question_id]: opt.label,
                            }));
                          }}
                        >
                          <span className="db-quiz-opt-badge">{opt.label}</span>
                          <span className="db-quiz-opt-text">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>

                  {lockedAnswers[activeQuestion.question_id] && (
                    <div
                      className={`db-quiz-proof ${
                        lockedAnswers[activeQuestion.question_id] ===
                        activeQuestion.correct_option
                          ? "is-right"
                          : "is-wrong"
                      }`}
                    >
                      {lockedAnswers[activeQuestion.question_id] ===
                      activeQuestion.correct_option ? (
                        <CheckCircle2 size={15} />
                      ) : (
                        <XCircle size={15} />
                      )}
                      <div className="db-quiz-proof-body">
                        <strong>
                          {lockedAnswers[activeQuestion.question_id] ===
                          activeQuestion.correct_option
                            ? "Correct Answer"
                            : `Not quite · Correct answer is ${activeQuestion.correct_option}`}
                        </strong>
                        <span>
                          Page {activeQuestion.source_page}: {activeQuestion.explanation}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="db-quiz-nav-footer">
                    <button
                      type="button"
                      className="db-mini-pill-btn"
                      disabled={currentQuizIdx === 0}
                      onClick={() => setCurrentQuizIdx((i) => Math.max(0, i - 1))}
                    >
                      <ArrowLeft size={12} />
                      <span>Previous</span>
                    </button>

                    {!lockedAnswers[activeQuestion.question_id] ? (
                      <button
                        type="button"
                        className="db-mini-pill-btn db-mini-pill-btn--accent"
                        disabled={!draftSelection[activeQuestion.question_id]}
                        onClick={() => {
                          const chosen = draftSelection[activeQuestion.question_id];
                          if (!chosen) return;
                          setLockedAnswers((prev) => ({
                            ...prev,
                            [activeQuestion.question_id]: chosen,
                          }));
                        }}
                      >
                        <CheckCircle2 size={12} />
                        <span>Check Answer</span>
                      </button>
                    ) : currentQuizIdx < totalQuestions - 1 ? (
                      <button
                        type="button"
                        className="db-mini-pill-btn db-mini-pill-btn--accent"
                        onClick={() =>
                          setCurrentQuizIdx((i) => Math.min(totalQuestions - 1, i + 1))
                        }
                      >
                        <span>Next Question</span>
                        <ArrowRight size={12} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="db-mini-pill-btn db-mini-pill-btn--accent"
                        onClick={() => setQuizCompleted(true)}
                      >
                        <Award size={12} />
                        <span>Finish &amp; View Score</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : null
          ) : (
            <div className="db-empty-dash-box">
              <BookOpen size={24} className="db-empty-icon" />
              <p>
                {activeDoc
                  ? `Start an interactive ${questionCount}-question quiz grounded in "${activeDoc.title}".`
                  : "Upload a document to practice with an interactive source-backed quiz."}
              </p>
              {!activeDoc && (
                <button
                  type="button"
                  className="db-mini-pill-btn db-mini-pill-btn--accent"
                  onClick={onTriggerUpload}
                >
                  <Upload size={12} />
                  <span>Upload Document</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Immersive Document Storytelling Voice Studio */}
        <div className="db-panel-box db-studio-card">
          <div className="db-panel-box-head db-studio-card-head">
            <div>
              <div className="db-panel-box-title">Document Storytelling Voice</div>
              <p className="db-panel-box-sub" style={{ margin: "4px 0 0" }}>
                Single-narrator chapter storytelling with natural HD OpenAI voices
              </p>
            </div>
            <button
              type="button"
              className="db-mini-pill-btn db-mini-pill-btn--accent"
              disabled={!activeDoc || audioLoading}
              onClick={() => onGenerateAudio(activeDoc?.id, storyStyle)}
            >
              {audioLoading ? (
                <Loader2 size={12} className="db-spin" />
              ) : (
                <Headphones size={12} />
              )}
              <span>
                {audioLoading ? "Crafting Story..." : audioResult ? "Regenerate Story" : "Create Story"}
              </span>
            </button>
          </div>

          {/* Storytelling Style & Narrator Voice Picker */}
          <div className="db-story-config-box">
            <div className="db-story-config-row">
              <span className="db-story-config-label">Narrative Style</span>
              <div className="db-story-chip-row">
                {STORY_STYLES.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    className={`db-story-chip ${storyStyle === st.id ? "is-active" : ""}`}
                    onClick={() => setStoryStyle(st.id)}
                    disabled={audioLoading}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="db-story-config-row">
              <span className="db-story-config-label">Narrator Voice</span>
              <div className="db-story-chip-row">
                {STORY_VOICES.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className={`db-story-chip ${selectedVoice === v.id ? "is-active" : ""}`}
                    onClick={() => handleSelectVoice(v.id)}
                    disabled={synthesizingAudio}
                    title={v.note}
                  >
                    <strong>{v.label}</strong>
                    <small>{v.note}</small>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {audioLoading ? (
            <div className="db-studio-loading-box">
              <Loader2 size={22} className="db-spin" />
              <strong>Writing narrative chapters...</strong>
              <span>Turning {activeDoc?.title || "your document"} into a cohesive spoken story</span>
            </div>
          ) : audioResult ? (
            <div className="db-audio-studio-body">
              <div className="db-studio-player">
                <div className="db-studio-player-controls">
                  <button
                    type="button"
                    className="db-studio-step-btn"
                    aria-label="Previous chapter"
                    disabled={activeTurnIdx <= 0 || synthesizingAudio}
                    onClick={() => {
                      if (synthesizedTurns && synthesizedVoiceKey === selectedVoice) {
                        playTurnAt(
                          Math.max(0, activeTurnIdx - 1),
                          synthesizedTurns,
                          useBrowserSpeech
                        );
                      } else {
                        setActiveTurnIdx((i) => Math.max(0, i - 1));
                      }
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
                        ? `Generating ${selectedVoice} Voice...`
                        : isPlaying
                        ? "Pause Story"
                        : "Play Story"}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="db-studio-step-btn"
                    aria-label="Next chapter"
                    disabled={
                      activeTurnIdx >= audioResult.script.length - 1 ||
                      synthesizingAudio
                    }
                    onClick={() => {
                      const nextIdx = Math.min(
                        audioResult.script.length - 1,
                        activeTurnIdx + 1
                      );
                      if (synthesizedTurns && synthesizedVoiceKey === selectedVoice) {
                        playTurnAt(nextIdx, synthesizedTurns, useBrowserSpeech);
                      } else {
                        setActiveTurnIdx(nextIdx);
                      }
                    }}
                  >
                    <SkipForward size={13} />
                  </button>

                  <button
                    type="button"
                    className="db-studio-speed-btn"
                    onClick={handleCycleSpeed}
                    title="Adjust narration speed"
                  >
                    {playbackSpeed}x
                  </button>
                </div>

                <div className="db-studio-player-meta">
                  <span className="db-studio-engine-badge">
                    <Volume2 size={11} />
                    <span>
                      Voice: {selectedVoice.charAt(0).toUpperCase() + selectedVoice.slice(1)}
                      {audioModelUsed ? ` · ${audioModelUsed}` : ""}
                    </span>
                  </span>
                  <span className="db-panel-box-sub">
                    Chapter {activeTurnIdx + 1}/{audioResult.script.length} ·{" "}
                    {audioResult.duration_estimate}
                  </span>
                </div>

                {audioError && <div className="db-studio-error">{audioError}</div>}
              </div>

              {audioResult.takeaway_summary && (
                <div className="db-story-takeaway">
                  <strong>Core Takeaway:</strong> {audioResult.takeaway_summary}
                </div>
              )}

              <div className="db-audio-script">
                {audioResult.script.map((turn, idx) => {
                  const speakingNow = (isPlaying || synthesizedTurns) && activeTurnIdx === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`db-audio-turn db-story-chapter ${speakingNow ? "is-speaking" : ""}`}
                      onClick={() => {
                        void synthesizeAndPlayAt(idx);
                      }}
                    >
                      <div className="db-story-chapter-head">
                        <span className="db-story-chapter-badge">{turn.speaker}</span>
                        <span className="db-story-chapter-play">
                          {speakingNow && isPlaying ? "Playing..." : "Listen"}
                        </span>
                      </div>
                      <p className="db-story-chapter-text">{turn.text}</p>
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
                  ? `Turn "${activeDoc.title}" into an engaging spoken story narrated by ${
                      selectedVoice.charAt(0).toUpperCase() + selectedVoice.slice(1)
                    }.`
                  : "Upload a document to listen to an immersive AI-narrated story."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
