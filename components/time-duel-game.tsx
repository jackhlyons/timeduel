"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
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
  onRevealComplete: () => void;
  resultsVisible: boolean;
  revealedYear?: number;
  showZoomHint: boolean;
};

type ImageViewerProps = {
  src: string;
  alt: string;
  onClose: () => void;
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

function YearTimeline({
  disabled,
  selectedYear,
  onChange,
  onSubmit,
  onRevealComplete,
  resultsVisible,
  revealedYear,
  showZoomHint,
}: YearTimelineProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const syncScrollRef = useRef(false);
  const revealAnimationFrameRef = useRef<number | null>(null);
  const pixelsPerYearRef = useRef(defaultZoom);
  const dragStateRef = useRef<{
    pointerId: number;
    clientX: number;
    scrollLeft: number;
  } | null>(null);
  const pinchStateRef = useRef<{
    centerYear: number;
    distance: number;
    zoom: number;
  } | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [pixelsPerYear, setPixelsPerYear] = useState(defaultZoom);
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

  useEffect(() => {
    if (
      typeof visibleRevealedYear === "number" &&
      !resultsVisible &&
      (visibleRevealedYear === selectedYear || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    ) {
      onRevealComplete();
    }
  }, [onRevealComplete, resultsVisible, selectedYear, visibleRevealedYear]);

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

      requestAnimationFrame(() => {
        syncScrollRef.current = false;
      });
    },
    [yearSpan],
  );

  const updateZoom = useCallback((nextZoom: number) => {
    const clampedZoom = clamp(nextZoom, minimumZoom, maximumZoom);
    const viewport = viewportRef.current;

    if (!viewport) {
      pixelsPerYearRef.current = clampedZoom;
      setPixelsPerYear(clampedZoom);
      return;
    }

    const centeredYear = clamp(
      minimumYear + viewport.scrollLeft / pixelsPerYearRef.current,
      minimumYear,
      maximumYear,
    );

    pixelsPerYearRef.current = clampedZoom;
    setPixelsPerYear(clampedZoom);

    requestAnimationFrame(() => {
      centerYearOnTimeline(centeredYear, clampedZoom);
    });
  }, [centerYearOnTimeline]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport || disabled) {
      return;
    }

    function handleWheel(event: globalThis.WheelEvent) {
      event.preventDefault();

      if (event.ctrlKey || event.metaKey) {
        const zoomFactor = event.deltaY > 0 ? 0.92 : 1.08;
        updateZoom(pixelsPerYearRef.current * zoomFactor);
        return;
      }

      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport!.clientWidth : 1;
      viewport!.scrollLeft += delta * unit;
    }

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [disabled, updateZoom]);

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

    const viewport = viewportRef.current;
    const centeredYear = viewport
      ? Math.round(minimumYear + viewport.scrollLeft / effectivePixelsPerYear)
      : null;

    // User scrolling already centers the selected year; preserve its fractional offset.
    if (centeredYear !== selectedYear) {
      centerYearOnTimeline(selectedYear, effectivePixelsPerYear);
    }
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

  function handleTimelinePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0 || disabled) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
    };
  }

  function handleTimelinePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    event.currentTarget.scrollLeft = drag.scrollLeft + drag.clientX - event.clientX;
  }

  function handleTimelinePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
    }
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
  const revealLineDistance =
    typeof revealedOffset === "number" ? Math.abs(revealedOffset - guessedOffset) : 0;
  const revealDifference =
    typeof visibleRevealedYear === "number" ? Math.abs(visibleRevealedYear - selectedYear) : 0;
  const isExactHit = revealDifference === 0 && typeof visibleRevealedYear === "number";
  const revealAnimationKey =
    typeof visibleRevealedYear === "number"
      ? `${selectedYear}-${visibleRevealedYear}-${Math.round(viewportWidth)}`
      : "hidden";

  return (
    <div className="w-full min-w-0 max-w-full rounded-[1.4rem] border-2 border-transparent bg-black px-2 py-3">
      <div className="relative min-w-0 max-w-full overflow-visible">
        <div className="mb-2 flex items-center justify-between px-3 text-[0.65rem] uppercase tracking-[0.26em] text-white/52">
          <span>{minimumYear}</span>
          <span aria-hidden="true" />
          <span>{maximumYear}</span>
        </div>

        <div className="relative z-10 w-full min-w-0 max-w-full overflow-visible">
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/65" />
          {!disabled ? (
            <div className="pointer-events-none absolute bottom-8.5 left-1/2 top-5.5 z-20 w-px -translate-x-1/2 bg-[#9f2626]" />
          ) : null}
          {!disabled ? (
            <>
              <button
                type="button"
                onClick={onSubmit}
                disabled={disabled}
                aria-label={`Guess ${selectedYear}`}
                className="absolute left-1/2 top-2 z-30 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-[#9f2626] transition hover:scale-110 active:scale-95"
              />
            </>
          ) : null}

          <div
            ref={viewportRef}
            onScroll={handleScroll}
            onPointerDown={handleTimelinePointerDown}
            onPointerMove={handleTimelinePointerMove}
            onPointerUp={handleTimelinePointerEnd}
            onPointerCancel={handleTimelinePointerEnd}
            onLostPointerCapture={handleTimelinePointerEnd}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={[
              "timeline-viewport relative h-24 w-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden",
              disabled ? "pointer-events-none" : "cursor-grab select-none active:cursor-grabbing",
            ].join(" ")}
          >
            <div className="relative h-full" style={{ width: `${contentWidth}px` }}>
              {typeof revealedOffset === "number" && revealDifference > 0 ? (
                <div
                  key={revealAnimationKey}
                  aria-hidden="true"
                  onAnimationEnd={(event) => {
                    if (event.animationName === "timeline-reveal-draw") {
                      onRevealComplete();
                    }
                  }}
                  className={`${resultsVisible ? "" : "timeline-reveal-line"} pointer-events-none absolute top-1/2 z-20 h-[3.5px] -translate-y-1/2 bg-[#9f2626]`}
                  style={{
                    left: `${Math.min(guessedOffset, revealedOffset)}px`,
                    width: `${revealLineDistance}px`,
                    transformOrigin: revealedOffset < guessedOffset ? "right center" : "left center",
                  }}
                />
              ) : null}
              {disabled ? (
                <div
                  className="pointer-events-none absolute top-0 z-10 h-full"
                  style={{
                    left: `${guessedOffset}px`,
                    transform: "translateX(-50%)",
                  }}
                >
                  <div className="absolute bottom-8.5 left-1/2 top-5.5 w-px -translate-x-1/2 bg-[#9f2626]" />
                  <div
                    className={[
                      "absolute left-1/2 top-2 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-[#9f2626]",
                      isExactHit && resultsVisible
                        ? "timeline-exact-pin"
                        : "",
                    ].join(" ")}
                  />
                </div>
              ) : null}
              {resultsVisible && typeof visibleRevealedYear === "number" ? (
                <div
                  className="pointer-events-none absolute top-0 z-10 h-full"
                  style={{
                    left: `${revealedOffset ?? 0}px`,
                    transform: "translateX(-50%)",
                  }}
                >
                  {!isExactHit ? (
                    <div className="timeline-correct-pin absolute inset-0">
                      <div className="absolute bottom-8.5 left-1/2 top-5.5 w-px -translate-x-1/2 bg-[#333333]" />
                      <div className="absolute left-1/2 top-2 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-[#333333]" />
                    </div>
                  ) : null}
                  <span className="absolute left-1/2 top-[calc(50%+1.85rem)] -translate-x-1/2 whitespace-nowrap text-[0.8rem] font-medium uppercase tracking-[0.12em] text-[#171717]">
                    {visibleRevealedYear}
                  </span>
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

                const tickHeight = isDecade ? 28 : isHalfDecade ? 19 : 10;
                const showLabel = !disabled && (isDecade || year === minimumYear || year === maximumYear);
                const showMobileLabel = year % 20 === 0 || year === minimumYear || year === maximumYear;

                return (
                  <div
                    key={year}
                    className="pointer-events-none absolute top-1/2"
                    style={{ left: `${offset}px`, transform: "translate(-50%, -50%)" }}
                  >
                    <div
                      className={[
                        "w-px bg-white/70",
                        isDecade ? "bg-white/95" : isHalfDecade ? "bg-white/75" : "bg-white/22",
                      ].join(" ")}
                      style={{ height: `${tickHeight}px` }}
                    />
                    {showLabel ? (
                      <span
                        className={[
                          "absolute left-1/2 top-[calc(100%+0.1rem)] -translate-x-1/2 whitespace-nowrap text-[0.68rem] uppercase tracking-[0.16em] text-white/68",
                          showMobileLabel ? "" : "hidden sm:inline",
                        ].join(" ")}
                      >
                        {year}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {showZoomHint ? (
          <p className="mt-1 text-center text-[0.6rem] uppercase tracking-[0.18em] text-white/42">
            <span className="sm:hidden">Pinch to zoom</span>
            <span className="hidden sm:inline">Pinch or ctrl-scroll to zoom</span>
          </p>
        ) : null}
      </div>

    </div>
  );
}

function ImageViewer({ src, alt, onClose }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const pinchStartRef = useRef<{ distance: number; zoom: number } | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function updateZoom(nextZoom: number) {
    const clampedZoom = clamp(nextZoom, 1, 4);

    zoomRef.current = clampedZoom;
    setZoom(clampedZoom);

    if (clampedZoom === 1) {
      panRef.current = { x: 0, y: 0 };
      setPan(panRef.current);
    }
  }

  function updatePan(nextPan: { x: number; y: number }) {
    panRef.current = nextPan;
    setPan(nextPan);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 1) {
      dragStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        panX: panRef.current.x,
        panY: panRef.current.y,
      };
      return;
    }

    if (pointersRef.current.size === 2) {
      const [firstPointer, secondPointer] = [...pointersRef.current.values()];

      pinchStartRef.current = {
        distance: Math.hypot(firstPointer.x - secondPointer.x, firstPointer.y - secondPointer.y),
        zoom: zoomRef.current,
      };
      dragStartRef.current = null;
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(event.pointerId)) {
      return;
    }

    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 2 && pinchStartRef.current) {
      const [firstPointer, secondPointer] = [...pointersRef.current.values()];
      const distance = Math.hypot(firstPointer.x - secondPointer.x, firstPointer.y - secondPointer.y);

      updateZoom(pinchStartRef.current.zoom * (distance / pinchStartRef.current.distance));
      return;
    }

    if (pointersRef.current.size === 1 && dragStartRef.current && zoomRef.current > 1) {
      updatePan({
        x: dragStartRef.current.panX + event.clientX - dragStartRef.current.x,
        y: dragStartRef.current.panY + event.clientY - dragStartRef.current.y,
      });
    }
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId);
    dragStartRef.current = null;
    pinchStartRef.current = null;
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    updateZoom(zoomRef.current * (event.deltaY > 0 ? 0.88 : 1.12));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Expanded image viewer"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-[#18243a]/90 text-2xl leading-none text-white transition hover:bg-white/15"
        aria-label="Close image viewer"
      >
        ×
      </button>
      <div
        className="relative h-[90vh] w-[94vw] max-w-7xl touch-none select-none"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onWheel={handleWheel}
        style={{ cursor: zoom > 1 ? "grab" : "zoom-in" }}
      >
        <div
          className="relative h-full w-full"
          style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})` }}
        >
          <Image
            src={src}
            alt={alt}
            fill
            unoptimized
            sizes="100vw"
            className="pointer-events-none object-contain"
          />
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
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [completedRevealRound, setCompletedRevealRound] = useState<number | null>(null);

  const currentQuestion = rounds[currentRound];
  const currentGuess = guesses[currentRound];
  const resultsVisible = Boolean(currentGuess) && completedRevealRound === currentRound;
  const handleRevealComplete = useCallback(() => {
    setCompletedRevealRound(currentRound);
  }, [currentRound]);
  const roundBadge = getRoundBadge(currentRound);
  const exactHits = guesses.filter((guess) => guess.difference === 0).length;
  const rawScore = guesses.reduce((sum, guess) => sum + guess.roundScore, 0);
  const totalScore = rawScore * finalScoreMultiplier;
  const averageScore = guesses.length > 0 ? Math.round(rawScore / guesses.length) : 0;
  const isFinished = currentRound >= totalRounds;
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
    setCompletedRevealRound(null);
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
    if (!resultsVisible) {
      return;
    }

    setCompletedRevealRound(null);
    setCurrentRound((round) => round + 1);
    setSelectedYear(defaultTimelineYear);
  }

  function renderBrand(lockupClassName = "") {
    return (
      <div
        className={[
          "mx-auto flex w-fit items-center gap-0 text-left sm:text-center",
          lockupClassName,
        ].join(" ")}
      >
        <span
          className="shrink-0 text-5xl leading-none sm:text-6xl"
          aria-hidden="true"
        >
          ⌛
        </span>
        <div className="flex flex-col items-start sm:items-center">
          <div className="flex items-baseline leading-none">
            <span className="text-6xl font-light tracking-[-0.06em] text-white sm:text-8xl">
              Time
            </span>
            <span className="text-6xl font-light tracking-[-0.06em] text-[#9f2626] sm:text-8xl">
              Duel
            </span>
          </div>
          <p className="relative left-2 -mt-2 text-left text-sm font-light tracking-[0.08em] text-white/88 sm:left-0 sm:-mt-3 sm:text-center sm:text-xl">
            Guess when history happened
          </p>
        </div>
      </div>
    );
  }

  function shell(children: ReactNode, isHomepage = false) {
    return (
      <main className={isHomepage
        ? "theme-inverted min-h-svh w-full max-w-full bg-white px-2 py-4 text-black sm:px-8"
        : "theme-inverted min-h-screen w-full max-w-full bg-white px-4 py-6 text-black sm:px-8 sm:py-8"}>
        <div className={isHomepage
          ? "mx-auto flex min-h-[calc(100svh-2rem)] w-full min-w-0 max-w-6xl flex-col"
          : "mx-auto flex min-h-[calc(100vh-3rem)] w-full min-w-0 max-w-6xl flex-col"}>
          {children}
        </div>
      </main>
    );
  }

  if (!hasStarted) {
    return shell(
      <section className="flex flex-1 flex-col items-center justify-center gap-6 py-4 sm:gap-8">
        {renderBrand()}

        <div className="flex w-full max-w-md flex-col items-center text-center text-black">
          <h1 className="text-base font-medium tracking-tight text-[#9f2626] sm:text-lg">
            The Daily Challenge
          </h1>
          <p className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
            #001
          </p>
          <time dateTime="2026-10-08" className="mt-1 text-sm sm:text-base">
            8 October 2026
          </time>
          <p className="mt-4 text-base leading-relaxed sm:text-lg">
            5 images. 5 guesses. Once a day.
          </p>
        </div>

        <div className="-mt-2 w-full max-w-80 sm:-mt-4">
          <button
            type="button"
            onClick={startGame}
            className="flex min-h-16 w-full cursor-pointer items-center justify-center gap-3 rounded-[1rem] border border-[#9f2626] bg-[#9f2626] px-4 py-4 text-center text-xl leading-6 font-medium text-[#fff] transition-colors hover:bg-[#862020] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#9f2626]"
          >
            Play Today&apos;s Duel <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>,
      true,
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
      <div className="mb-2 flex justify-center" aria-label="TimeDuel">
        <div className="flex leading-none">
          <span className="text-6xl font-light tracking-[-0.06em] text-white/78 sm:text-7xl">Time</span>
          <span className="text-6xl font-light tracking-[-0.06em] text-[#9f2626] sm:text-7xl">Duel</span>
        </div>
      </div>
      <div className="mb-3 flex justify-center">
        <div className="flex items-center gap-2 text-center text-[0.65rem] font-medium uppercase tracking-[0.16em] text-white/48">
          <p>
            Round {currentRound + 1} / {totalRounds}
          </p>
          <span
            className={[
              "rounded-full px-2 py-0.5 text-[0.56rem] font-semibold tracking-[0.12em] text-white/90 opacity-85",
              roundBadge.className,
            ].join(" ")}
          >
            {roundBadge.label}
          </span>
        </div>
      </div>

      <div className="flex w-full min-w-0 max-w-full flex-1 flex-col items-center gap-4 py-3">
        <div className="w-full min-w-0 max-w-3xl">
          <div className="relative flex min-h-[3.5rem] min-w-0 flex-col justify-center rounded-[1rem] border border-transparent bg-transparent px-3 py-0.5 text-left sm:min-h-[3.25rem]">
            <p className="translate-y-2 text-xs uppercase tracking-[0.3em] text-white/58">
              PHOTO
            </p>
            <p className="mt-0.5 translate-y-2 text-base leading-5 text-white/88">
              What year was this photo taken?
            </p>
          </div>
        </div>

        <div className="flex min-h-0 w-full min-w-0 max-w-3xl flex-1 flex-col">
          <div className="relative min-h-[18rem] w-full min-w-0 max-w-full flex-1 overflow-hidden rounded-[1.4rem] border-2 border-transparent bg-black sm:min-h-[24rem]">
            <Image
              src={currentQuestion.imageUrl}
              alt={currentQuestion.imageAlt}
              fill
              priority
              sizes="(max-width: 768px) calc(100vw - 32px), 900px"
              className="max-w-full rounded-[1.25rem] object-contain"
            />
            <button
              type="button"
              onClick={() => setIsImageViewerOpen(true)}
              className="absolute inset-0 z-20 cursor-zoom-in"
              aria-label="Open full-screen image viewer"
            />
          </div>

          <div className="relative mt-11 sm:mt-16">
            {currentGuess ? (
              <div className="mb-4 min-h-6">
                {resultsVisible ? (
                  <p
                    role="status"
                    className="px-3 text-center text-lg font-medium leading-6 text-[#333333] sm:text-xl"
                  >
                    {currentGuess.difference === 0
                      ? `Exact hit · ${currentGuess.roundScore} points`
                      : `${currentGuess.difference} year${currentGuess.difference === 1 ? "" : "s"} too ${currentGuess.selectedYear < currentQuestion.year ? "early" : "late"} · ${currentGuess.roundScore} points`}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="pointer-events-none absolute left-1/2 top-5 z-10 -translate-x-1/2 -translate-y-1/2 text-center text-3xl font-medium tracking-[-0.06em] text-black sm:top-4 sm:text-5xl">
                {selectedYear}
              </p>
            )}
            <YearTimeline
              key={currentQuestion.id}
              disabled={Boolean(currentGuess)}
              selectedYear={currentGuess?.selectedYear ?? selectedYear}
              onChange={setSelectedYear}
              onSubmit={handleGuess}
              onRevealComplete={handleRevealComplete}
              resultsVisible={resultsVisible}
              revealedYear={currentGuess ? currentQuestion.year : undefined}
              showZoomHint={currentRound === 0 && !currentGuess}
            />
            <div className="mx-auto mt-4 w-full max-w-80">
              {!currentGuess || resultsVisible ? (
                <button
                  type="button"
                  onClick={currentGuess ? advanceRound : handleGuess}
                  className="flex min-h-16 w-full cursor-pointer items-center justify-center gap-3 rounded-[1rem] border border-[#9f2626] bg-[#9f2626] px-4 py-4 text-center text-xl leading-6 font-medium text-[#fff] transition-colors hover:bg-[#862020] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#9f2626]"
                >
                  {currentGuess
                    ? currentRound === totalRounds - 1 ? "See Results" : "Next Round"
                    : "Guess"} <span aria-hidden="true">→</span>
                </button>
              ) : (
                <div className="min-h-16" />
              )}
            </div>
          </div>
        </div>

        <div className="min-h-[1rem] w-full min-w-0 max-w-3xl" />

        <div className="min-h-[2.5rem] w-full min-w-0 max-w-3xl">
          {resultsVisible && currentQuestion.imageCredit ? (
            <div className="mx-auto w-full min-w-0 max-w-3xl text-center text-sm leading-6 text-white/74">
              <p className="font-medium text-white/88">{currentQuestion.imageCredit}</p>
            </div>
          ) : null}
        </div>
      </div>
      {isImageViewerOpen ? (
        <ImageViewer
          key={currentQuestion.id}
          src={currentQuestion.imageUrl}
          alt={currentQuestion.imageAlt}
          onClose={() => setIsImageViewerOpen(false)}
        />
      ) : null}
    </section>,
  );
}
