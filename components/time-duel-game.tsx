"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
  type WheelEvent,
} from "react";

import { questions } from "@/data/questions";

type GuessRecord = {
  questionId: number;
  selectedYear: number;
  difference: number;
  roundScore: number;
};

type YearTimelineProps = {
  disabled: boolean;
  selectedYear: number;
  onChange: (year: number) => void;
  onSubmit: () => void;
  revealedYear?: number;
};

const rounds = questions.slice(0, 5);
const totalRounds = rounds.length;
const minimumYear = 1900;
const maximumYear = 2026;
const defaultTimelineYear = maximumYear;
const minimumZoom = 1;
const maximumZoom = 28;
const defaultZoom = 8;
const halfDecadeTickZoomThreshold = 4;
const yearlyTickZoomThreshold = 10;
const maximumRoundScore = 100;
const finalScoreMultiplier = 2;
const scoreFadeYears = 50;
const categories = [
  "Classic",
  "Football",
  "Key Events",
  "All Time",
  "Music",
  "More...",
] as const;
const exactHitConfettiPieces = [
  { left: "8%", delay: "0ms", duration: "2200ms", rotation: "-18deg", size: "0.55rem" },
  { left: "16%", delay: "140ms", duration: "2000ms", rotation: "22deg", size: "0.45rem" },
  { left: "23%", delay: "60ms", duration: "2350ms", rotation: "-32deg", size: "0.5rem" },
  { left: "31%", delay: "210ms", duration: "2100ms", rotation: "28deg", size: "0.4rem" },
  { left: "39%", delay: "0ms", duration: "1950ms", rotation: "-12deg", size: "0.6rem" },
  { left: "47%", delay: "170ms", duration: "2400ms", rotation: "34deg", size: "0.5rem" },
  { left: "56%", delay: "110ms", duration: "2050ms", rotation: "-24deg", size: "0.45rem" },
  { left: "64%", delay: "250ms", duration: "2250ms", rotation: "16deg", size: "0.55rem" },
  { left: "73%", delay: "80ms", duration: "2150ms", rotation: "-28deg", size: "0.42rem" },
  { left: "82%", delay: "190ms", duration: "2300ms", rotation: "26deg", size: "0.5rem" },
  { left: "90%", delay: "40ms", duration: "2000ms", rotation: "-20deg", size: "0.58rem" },
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function touchDistance(
  touchA: { clientX: number; clientY: number },
  touchB: { clientX: number; clientY: number },
) {
  return Math.hypot(touchA.clientX - touchB.clientX, touchA.clientY - touchB.clientY);
}

function getRoundScore(difference: number) {
  const normalized = 1 - clamp(difference / scoreFadeYears, 0, 1);
  return Math.round(normalized * maximumRoundScore);
}

function getRoundBadge(roundIndex: number) {
  if (roundIndex <= 1) {
    return { label: "easy", className: "bg-[#2f8f4e]" };
  }

  if (roundIndex === 2) {
    return { label: "medium", className: "bg-[#d3a72c]" };
  }

  return { label: "hard", className: "bg-[#cf6f2d]" };
}

function getShareScoreEmoji(score: number) {
  if (score === 100) {
    return "🎯";
  }

  if (score >= 92) {
    return "👑";
  }

  if (score >= 88) {
    return "🏅";
  }

  if (score >= 75) {
    return "🎉";
  }

  if (score >= 55) {
    return "😅";
  }

  if (score >= 35) {
    return "😬";
  }

  if (score >= 15) {
    return "😕";
  }

  return "😵";
}

function getShareDateLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

function YearTimeline({ disabled, selectedYear, onChange, onSubmit, revealedYear }: YearTimelineProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const syncScrollRef = useRef(false);
  const revealAnimationFrameRef = useRef<number | null>(null);
  const pixelsPerYearRef = useRef(defaultZoom);
  const pinchStateRef = useRef<{
    centerYear: number;
    distance: number;
    zoom: number;
  } | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [pixelsPerYear, setPixelsPerYear] = useState(defaultZoom);
  const [timelineScrollLeft, setTimelineScrollLeft] = useState(0);
  const [readyRevealKey, setReadyRevealKey] = useState<string | null>(null);

  const yearSpan = maximumYear - minimumYear;
  const years = Array.from({ length: yearSpan + 1 }, (_, index) => minimumYear + index);
  const effectivePixelsPerYear = pixelsPerYear;
  const showHalfDecadeTicks = effectivePixelsPerYear >= halfDecadeTickZoomThreshold;
  const showYearlyTicks = effectivePixelsPerYear >= yearlyTickZoomThreshold;
  const contentWidth = yearSpan * effectivePixelsPerYear + viewportWidth;
  const revealKey =
    typeof revealedYear === "number" ? `${selectedYear}-${revealedYear}` : null;
  const visibleRevealedYear = readyRevealKey === revealKey ? revealedYear : undefined;

  const centerYearOnTimeline = useCallback(
    (year: number, zoom: number) => {
      const viewport = viewportRef.current;

      if (!viewport) {
        return;
      }

      const nextScrollLeft = clamp(
        (clamp(year, minimumYear, maximumYear) - minimumYear) * zoom,
        0,
        Math.max(0, yearSpan * zoom),
      );

      syncScrollRef.current = true;
      viewport.scrollLeft = nextScrollLeft;
      setTimelineScrollLeft(nextScrollLeft);
      requestAnimationFrame(() => {
        syncScrollRef.current = false;
      });
    },
    [yearSpan],
  );

  function updateZoom(nextZoom: number) {
    const clampedZoom = clamp(nextZoom, minimumZoom, maximumZoom);
    const viewport = viewportRef.current;

    if (!viewport) {
      pixelsPerYearRef.current = clampedZoom;
      setPixelsPerYear(clampedZoom);
      return;
    }

    const centeredYear = clamp(
      minimumYear + viewport.scrollLeft / effectivePixelsPerYear,
      minimumYear,
      maximumYear,
    );

    pixelsPerYearRef.current = clampedZoom;
    setPixelsPerYear(clampedZoom);

    requestAnimationFrame(() => {
      centerYearOnTimeline(centeredYear, clampedZoom);
    });
  }

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const observer = new ResizeObserver(() => {
      setViewportWidth(viewport.clientWidth);
    });

    observer.observe(viewport);
    setViewportWidth(viewport.clientWidth);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    pixelsPerYearRef.current = pixelsPerYear;
  }, [pixelsPerYear]);

  useEffect(() => {
    if (viewportWidth === 0 || typeof revealedYear === "number") {
      return;
    }

    centerYearOnTimeline(selectedYear, effectivePixelsPerYear);
  }, [centerYearOnTimeline, effectivePixelsPerYear, revealedYear, selectedYear, viewportWidth]);

  useEffect(() => {
    if (typeof revealedYear !== "number") {
      if (revealAnimationFrameRef.current !== null) {
        cancelAnimationFrame(revealAnimationFrameRef.current);
        revealAnimationFrameRef.current = null;
      }

      return;
    }

    const viewport = viewportRef.current;

    if (!viewport || viewportWidth === 0 || revealAnimationFrameRef.current !== null) {
      return;
    }

    const currentZoom = pixelsPerYearRef.current;
    const visibleStart = minimumYear + (viewport.scrollLeft - viewportWidth / 2) / currentZoom;
    const visibleEnd = minimumYear + (viewport.scrollLeft + viewportWidth / 2) / currentZoom;

    if (revealedYear >= visibleStart && revealedYear <= visibleEnd) {
      revealAnimationFrameRef.current = requestAnimationFrame(() => {
        revealAnimationFrameRef.current = null;
        setReadyRevealKey(revealKey);
      });
      return;
    }

    // Zoom only as far as needed to reveal the answer while the guess stays centered.
    const targetZoom = clamp(
      (viewportWidth * 0.42) / Math.max(1, Math.abs(revealedYear - selectedYear)),
      minimumZoom,
      currentZoom,
    );

    if (targetZoom === currentZoom) {
      revealAnimationFrameRef.current = requestAnimationFrame(() => {
        revealAnimationFrameRef.current = null;
        setReadyRevealKey(revealKey);
      });
      return;
    }

    const startedAt = performance.now();
    const duration = 600;

    function animateZoom(now: number) {
      const progress = clamp((now - startedAt) / duration, 0, 1);
      const easedProgress = 1 - (1 - progress) ** 3;
      const nextZoom = currentZoom + (targetZoom - currentZoom) * easedProgress;

      pixelsPerYearRef.current = nextZoom;
      setPixelsPerYear(nextZoom);
      centerYearOnTimeline(selectedYear, nextZoom);

      if (progress < 1) {
        revealAnimationFrameRef.current = requestAnimationFrame(animateZoom);
        return;
      }

      revealAnimationFrameRef.current = null;
      setReadyRevealKey(revealKey);
    }

    revealAnimationFrameRef.current = requestAnimationFrame(animateZoom);

    return () => {
      if (revealAnimationFrameRef.current !== null) {
        cancelAnimationFrame(revealAnimationFrameRef.current);
        revealAnimationFrameRef.current = null;
      }
    };
  }, [centerYearOnTimeline, revealKey, revealedYear, selectedYear, viewportWidth]);

  function handleScroll() {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    setTimelineScrollLeft(viewport.scrollLeft);

    if (syncScrollRef.current || disabled) {
      return;
    }

    const year = clamp(
      Math.round(minimumYear + viewport.scrollLeft / effectivePixelsPerYear),
      minimumYear,
      maximumYear,
    );

    if (year !== selectedYear) {
      onChange(year);
    }
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    event.preventDefault();

    const zoomFactor = event.deltaY > 0 ? 0.92 : 1.08;
    updateZoom(effectivePixelsPerYear * zoomFactor);
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 2) {
      pinchStateRef.current = null;
      return;
    }

    const [touchA, touchB] = [event.touches[0], event.touches[1]];

    pinchStateRef.current = {
      centerYear: selectedYear,
      distance: touchDistance(touchA, touchB),
      zoom: effectivePixelsPerYear,
    };
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 2 || !pinchStateRef.current) {
      return;
    }

    event.preventDefault();

    const [touchA, touchB] = [event.touches[0], event.touches[1]];
    const nextDistance = touchDistance(touchA, touchB);
    const scale = nextDistance / pinchStateRef.current.distance;
    const nextZoom = pinchStateRef.current.zoom * scale;

    const clampedZoom = clamp(nextZoom, minimumZoom, maximumZoom);

    pixelsPerYearRef.current = clampedZoom;
    setPixelsPerYear(clampedZoom);

    requestAnimationFrame(() => {
      centerYearOnTimeline(pinchStateRef.current?.centerYear ?? selectedYear, clampedZoom);
    });
  }

  function handleTouchEnd() {
    pinchStateRef.current = null;
  }

  const revealedOffset =
    typeof visibleRevealedYear === "number"
      ? (clamp(visibleRevealedYear, minimumYear, maximumYear) - minimumYear) *
          effectivePixelsPerYear +
        viewportWidth / 2
      : null;
  const guessedOffset =
    (clamp(selectedYear, minimumYear, maximumYear) - minimumYear) * effectivePixelsPerYear + viewportWidth / 2;
  const revealLineStartX = guessedOffset - timelineScrollLeft;
  const revealLineEndX =
    typeof revealedOffset === "number"
      ? revealedOffset - timelineScrollLeft
      : null;
  const revealLineDistance =
    typeof revealLineEndX === "number" ? Math.abs(revealLineEndX - revealLineStartX) : 0;
  const revealLineCurveHeight = clamp(20 + revealLineDistance * 0.12, 20, 56);
  const revealLinePath =
    typeof revealLineEndX === "number"
      ? `M ${revealLineStartX} 26 Q ${(revealLineStartX + revealLineEndX) / 2} ${26 - revealLineCurveHeight} ${revealLineEndX} 26`
      : "";
  const revealDifference =
    typeof visibleRevealedYear === "number" ? Math.abs(visibleRevealedYear - selectedYear) : 0;
  const isExactHit = revealDifference === 0 && typeof visibleRevealedYear === "number";
  const revealAnimationKey =
    typeof visibleRevealedYear === "number"
      ? `${selectedYear}-${visibleRevealedYear}-${Math.round(viewportWidth)}`
      : "hidden";

  return (
    <div className="w-full min-w-0 max-w-full rounded-[1.4rem] border-[4px] border-white bg-[#132041]/85 px-2 py-3">
      <div className="relative min-w-0 max-w-full overflow-visible rounded-[1.2rem] border border-white/10 bg-[#162348]">
        <div className="mb-2 flex items-center justify-between px-3 text-[0.65rem] uppercase tracking-[0.26em] text-white/52">
          <span>{minimumYear}</span>
          <span>Pinch or ctrl-scroll to zoom</span>
          <span>{maximumYear}</span>
        </div>

        <div className="relative z-10 w-full min-w-0 max-w-full overflow-visible">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_23%,rgba(255,255,255,0.08)_24%,transparent_25%,transparent_73%,rgba(255,255,255,0.08)_74%,transparent_75%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/65" />
          {!disabled ? (
            <div className="pointer-events-none absolute left-1/2 top-0 z-20 h-full w-px -translate-x-1/2 bg-[#f7b63d]" />
          ) : null}
          {typeof visibleRevealedYear === "number" && revealDifference > 0 ? (
            <svg
              key={revealAnimationKey}
              className="pointer-events-none absolute inset-0 z-20 overflow-visible"
              viewBox={`0 0 ${Math.max(viewportWidth, 1)} 96`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d={revealLinePath}
                className="timeline-reveal-line"
                pathLength={100}
                fill="none"
                stroke="#6dff87"
                strokeWidth={2.5}
                strokeLinecap="round"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="100"
                  to="0"
                  dur="3s"
                  fill="freeze"
                />
              </path>
              <path
                d={revealLinePath}
                className="timeline-reveal-line timeline-reveal-line-glow"
                pathLength={100}
                fill="none"
                stroke="rgba(109, 255, 135, 0.3)"
                strokeWidth={7}
                strokeLinecap="round"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="100"
                  to="0"
                  dur="3s"
                  fill="freeze"
                />
              </path>
            </svg>
          ) : null}
          {!disabled ? (
            <button
              type="button"
              onClick={onSubmit}
              disabled={disabled}
              aria-label={`Guess ${selectedYear}`}
              className="absolute left-1/2 top-3 z-30 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-[#f7b63d] transition hover:scale-110 active:scale-95"
            />
          ) : null}

          <div
            ref={viewportRef}
            onScroll={handleScroll}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={[
              "timeline-viewport relative h-24 w-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden",
              disabled ? "pointer-events-none" : "",
            ].join(" ")}
          >
            <div className="relative h-full" style={{ width: `${contentWidth}px` }}>
              {disabled ? (
                <div
                  className="pointer-events-none absolute top-0 z-10 h-full"
                  style={{
                    left: `${guessedOffset}px`,
                    transform: "translateX(-50%)",
                  }}
                >
                  <div
                    className={[
                      "absolute left-1/2 top-0 h-full w-px -translate-x-1/2",
                      isExactHit ? "bg-[#39d353]" : "bg-[#f7b63d]",
                    ].join(" ")}
                  />
                  <div
                    className={[
                      "absolute left-1/2 top-3 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white",
                      isExactHit
                        ? "bg-[#39d353] shadow-[0_0_0_0_rgba(57,211,83,0.85)] animate-[timeline-pin-flash_900ms_ease-in-out_infinite]"
                        : "bg-[#f7b63d]",
                    ].join(" ")}
                  />
                </div>
              ) : null}
              {typeof visibleRevealedYear === "number" ? (
                <div
                  className="pointer-events-none absolute top-0 z-10 h-full"
                  style={{
                    left: `${revealedOffset ?? 0}px`,
                    transform: "translateX(-50%)",
                  }}
                >
                  <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#39d353]" />
                  <div className="absolute left-1/2 top-3 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-[#39d353]" />
                </div>
              ) : null}

              {years.map((year) => {
                const offset = (year - minimumYear) * effectivePixelsPerYear + viewportWidth / 2;
                const isDecade = year % 10 === 0;
                const isHalfDecade = year % 5 === 0;
                const shouldRenderTick =
                  isDecade || (isHalfDecade && showHalfDecadeTicks) || showYearlyTicks;

                if (!shouldRenderTick) {
                  return null;
                }

                const tickHeight = isDecade ? 56 : isHalfDecade ? 38 : 20;
                const showLabel = isDecade || year === minimumYear || year === maximumYear;

                return (
                  <div
                    key={year}
                    className="pointer-events-none absolute top-1/2"
                    style={{ left: `${offset}px`, transform: "translate(-50%, -50%)" }}
                  >
                    <div
                      className={[
                        "w-px bg-white/70",
                        isDecade ? "bg-white/95" : isHalfDecade ? "bg-white/75" : "bg-white/42",
                      ].join(" ")}
                      style={{ height: `${tickHeight}px` }}
                    />
                    {showLabel ? (
                      <span className="absolute left-1/2 top-[calc(100%+0.55rem)] -translate-x-1/2 whitespace-nowrap text-[0.68rem] uppercase tracking-[0.16em] text-white/68">
                        {year}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export function TimeDuelGame() {
  const [hasStarted, setHasStarted] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [guesses, setGuesses] = useState<GuessRecord[]>([]);
  const [selectedYear, setSelectedYear] = useState(defaultTimelineYear);
  const [shareCopyState, setShareCopyState] = useState<"idle" | "copied" | "error">("idle");

  const currentQuestion = rounds[currentRound];
  const currentGuess = guesses[currentRound];
  const roundBadge = getRoundBadge(currentRound);
  const exactHits = guesses.filter((guess) => guess.difference === 0).length;
  const rawScore = guesses.reduce((sum, guess) => sum + guess.roundScore, 0);
  const totalScore = rawScore * finalScoreMultiplier;
  const averageScore = guesses.length > 0 ? Math.round(rawScore / guesses.length) : 0;
  const isFinished = currentRound >= totalRounds;
  const isExactHitRound = currentGuess?.difference === 0;
  const shareDateLabel = getShareDateLabel(new Date());
  const shareEmojiRow = guesses
    .map((guess) => `${guess.roundScore}${getShareScoreEmoji(guess.roundScore)}`)
    .join(" ");
  const shareScoreText = [
    `www.timeduel.io ${shareDateLabel}`,
    shareEmojiRow,
    `Final score: ${totalScore}`,
  ].join("\n");

  async function handleCopyScore() {
    try {
      await navigator.clipboard.writeText(shareScoreText);
      setShareCopyState("copied");
    } catch {
      setShareCopyState("error");
    }
  }

  function startGame() {
    setHasStarted(true);
    setCurrentRound(0);
    setGuesses([]);
    setSelectedYear(defaultTimelineYear);
    setShareCopyState("idle");
  }

  function handleGuess() {
    if (!currentQuestion || currentGuess) {
      return;
    }

    const difference = Math.abs(selectedYear - currentQuestion.year);

    setGuesses((previous) => [
      ...previous,
      {
        questionId: currentQuestion.id,
        selectedYear,
        difference,
        roundScore: getRoundScore(difference),
      },
    ]);
  }

  function advanceRound() {
    setCurrentRound((round) => round + 1);
    setSelectedYear(defaultTimelineYear);
  }

  function renderBrand(lockupClassName = "") {
    return (
      <div className={["text-center", lockupClassName].join(" ")}>
        <div className="flex items-end justify-center gap-3">
          <span className="text-5xl leading-none sm:text-6xl" aria-hidden="true">
            ⌛
          </span>
          <div className="flex items-end leading-none">
            <span className="text-6xl font-light tracking-[-0.06em] text-white sm:text-8xl">
              Time
            </span>
            <span className="text-6xl font-light tracking-[-0.06em] text-[#f7b63d] sm:text-8xl">
              Duel
            </span>
          </div>
        </div>
        <p className="mt-2 text-sm font-light tracking-[0.08em] text-white/88 sm:text-xl">
          Guess when history happened
        </p>
      </div>
    );
  }

  function shell(children: ReactNode) {
    return (
      <main className="min-h-screen w-full max-w-full bg-[#162348] px-4 py-6 text-white sm:px-8 sm:py-8">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full min-w-0 max-w-6xl flex-col">
          {children}
        </div>
      </main>
    );
  }

  if (!hasStarted) {
    return shell(
      <section className="flex flex-1 flex-col items-center justify-center gap-12 py-8 sm:gap-16">
        {renderBrand()}

        <button
          type="button"
          onClick={startGame}
          className="flex h-24 w-full max-w-5xl items-center justify-center rounded-[1rem] border-[4px] border-white px-4 py-2 text-center text-6xl font-medium tracking-[-0.06em] text-white transition hover:bg-white/6 sm:h-32 sm:px-5 sm:text-9xl"
        >
          Play Now
        </button>

        <div className="grid w-full max-w-5xl grid-cols-2 gap-6 sm:grid-cols-3">
          {categories.map((category) => (
            <div
              key={category}
              className="flex h-24 w-full items-center justify-center rounded-[1rem] border-[4px] border-white px-4 py-2 text-center text-2xl font-medium tracking-[-0.03em] text-white sm:h-32 sm:px-5 sm:text-5xl"
            >
              {category}
            </div>
          ))}
        </div>
      </section>,
    );
  }

  if (isFinished) {
    return shell(
      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center py-6">
        {renderBrand("mb-8")}

        <div className="rounded-[2rem] border-[4px] border-white p-6 sm:p-10">
          <p className="text-center text-sm uppercase tracking-[0.45em] text-white/70">
            Final results
          </p>
          <div className="mt-6 grid gap-4 text-center sm:grid-cols-3">
            <div className="rounded-[1.4rem] border-[3px] border-white px-4 py-5">
              <p className="text-xs uppercase tracking-[0.3em] text-white/62">Exact hits</p>
              <p className="mt-3 text-5xl font-medium tracking-[-0.06em] text-white">
                {exactHits}
              </p>
            </div>
            <div className="rounded-[1.4rem] border-[3px] border-white px-4 py-5">
              <p className="text-xs uppercase tracking-[0.3em] text-white/62">Total score</p>
              <p className="mt-3 text-5xl font-medium tracking-[-0.06em] text-white">
                {totalScore}
              </p>
            </div>
            <div className="rounded-[1.4rem] border-[3px] border-white px-4 py-5">
              <p className="text-xs uppercase tracking-[0.3em] text-white/62">Avg. round</p>
              <p className="mt-3 text-5xl font-medium tracking-[-0.06em] text-white">
                {averageScore}
              </p>
            </div>
          </div>
          <p className="mx-auto mt-6 max-w-xl text-center text-lg text-white/78 sm:text-xl">
            {rawScore === totalRounds * maximumRoundScore
              ? "Perfect run."
              : "Push for a higher score on the next run."}
          </p>

          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleCopyScore}
              className="rounded-[1rem] border-[3px] border-white px-6 py-3 text-lg font-medium tracking-[-0.03em] text-white transition hover:bg-white/6"
            >
              {shareCopyState === "copied" ? "Score Copied" : "Copy Share Score"}
            </button>
            <p className="text-center text-sm text-white/66">
              {shareCopyState === "error"
                ? "Clipboard copy failed. Try again."
                : `Share format: ${shareEmojiRow}`}
            </p>
          </div>

          <div className="mt-8 grid gap-3">
            {rounds.map((question, index) => {
              const guess = guesses[index];

              return (
                <div
                  key={question.id}
                  className="flex items-center gap-3 rounded-[1.1rem] border-[3px] border-white px-4 py-3 text-sm sm:gap-4 sm:px-5 sm:text-lg"
                >
                  <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-[0.65rem] border border-white/30 bg-[#132041] sm:h-14 sm:w-20">
                    <Image
                      src={question.imageUrl}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                    <span className="shrink-0 tracking-[0.18em] text-white/72">
                      ROUND {index + 1}
                    </span>
                    <span className="text-right text-white">
                      {guess?.selectedYear ?? "No guess"} / {question.year}
                      {guess ? ` (${guess.roundScore} pts)` : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={startGame}
              className="rounded-[1.15rem] border-[4px] border-white px-8 py-4 text-3xl font-medium tracking-[-0.04em] text-white transition hover:bg-white/6 sm:text-5xl"
            >
              Play Again
            </button>
          </div>
        </div>
      </section>,
    );
  }

  return shell(
    <section className="flex w-full min-w-0 max-w-full flex-1 flex-col py-1">
      <div className="mb-3 flex justify-center">
        <div
          className={[
            "rounded-full border border-white/18 px-4 py-1.5 text-center shadow-[0_8px_20px_rgba(0,0,0,0.14)]",
            roundBadge.className,
          ].join(" ")}
        >
          <p className="text-sm font-medium tracking-[-0.03em] text-white">
            Round {currentRound + 1} ({roundBadge.label}) out of {totalRounds}
          </p>
        </div>
      </div>

      <div className="grid w-full min-w-0 max-w-full flex-1 grid-rows-[auto_auto_auto_1fr] justify-items-center gap-4 py-3">
        <div className="w-full min-w-0 max-w-3xl">
          <div className="relative min-h-[6.5rem] min-w-0 rounded-[1rem] border border-white/14 bg-white/6 px-3 py-1.5 text-left sm:min-h-[5.75rem]">
            <p className="text-xs uppercase tracking-[0.3em] text-white/58">
              {currentGuess ? "Your result" : "PHOTO"}
            </p>
            <p className="mt-1 break-words pr-32 text-base leading-5 text-white/88">
              {currentGuess
                ? currentGuess.difference === 0
                  ? `Exact hit. ${currentGuess.roundScore} points.`
                  : `${currentGuess.selectedYear < currentQuestion.year ? "Too early" : "Too late"} by ${currentGuess.difference} year${currentGuess.difference === 1 ? "" : "s"}. ${currentGuess.roundScore} points. The correct year was ${currentQuestion.year}.`
                : "What year was this photo taken?"}
            </p>
            {currentGuess ? (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <button
                  type="button"
                  onClick={advanceRound}
                  className="rounded-[0.85rem] border-[3px] border-white px-4 py-1.5 text-lg font-medium tracking-[-0.04em] text-white transition hover:bg-white/6"
                >
                  {currentRound === totalRounds - 1 ? "See Results" : "Next Round"}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="w-full min-w-0 max-w-3xl">
          <div className="relative aspect-[4/3] w-full min-w-0 max-w-full overflow-hidden rounded-[1.4rem] border-[4px] border-white bg-[#132041]">
            {isExactHitRound ? (
              <div key={`confetti-${currentRound}-${currentQuestion.id}`} className="pointer-events-none absolute inset-0 z-10">
                {exactHitConfettiPieces.map((piece, index) => (
                  <span
                    key={`${currentQuestion.id}-${index}`}
                    className="absolute top-[-12%] timeline-confetti"
                    style={{
                      left: piece.left,
                      width: piece.size,
                      height: `calc(${piece.size} * 1.9)`,
                      rotate: piece.rotation,
                      animationDelay: piece.delay,
                      animationDuration: piece.duration,
                    }}
                  />
                ))}
              </div>
            ) : null}
            <Image
              src={currentQuestion.imageUrl}
              alt={currentQuestion.imageAlt}
              fill
              priority
              sizes="(max-width: 768px) calc(100vw - 32px), 900px"
              className="max-w-full object-contain"
            />
            <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/18 bg-[#101a35]/92 px-5 py-1.5 text-center shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
              <p className="text-[0.58rem] uppercase tracking-[0.26em] text-white/55">Year</p>
              <p className="mt-0.5 text-2xl font-medium tracking-[-0.06em] text-white">
                {currentGuess?.selectedYear ?? selectedYear}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <YearTimeline
              disabled={Boolean(currentGuess)}
              selectedYear={currentGuess?.selectedYear ?? selectedYear}
              onChange={setSelectedYear}
              onSubmit={handleGuess}
              revealedYear={currentGuess ? currentQuestion.year : undefined}
            />
          </div>
        </div>

        <div className="min-h-[1rem] w-full min-w-0 max-w-3xl" />

        <div className="min-h-[2.5rem] w-full min-w-0 max-w-3xl">
          {currentGuess && currentQuestion.imageCredit ? (
            <div className="mx-auto w-full min-w-0 max-w-3xl text-center text-sm leading-6 text-white/74">
              <p className="font-medium text-white/88">{currentQuestion.imageCredit}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>,
  );
}
