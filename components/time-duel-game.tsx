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
const minimumZoom = 4;
const maximumZoom = 28;
const defaultZoom = 8;
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

function YearTimeline({ disabled, selectedYear, onChange, onSubmit, revealedYear }: YearTimelineProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const syncScrollRef = useRef(false);
  const pinchStateRef = useRef<{
    centerYear: number;
    distance: number;
    zoom: number;
  } | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [pixelsPerYear, setPixelsPerYear] = useState(defaultZoom);

  const yearSpan = maximumYear - minimumYear;
  const years = Array.from({ length: yearSpan + 1 }, (_, index) => minimumYear + index);
  const contentWidth = yearSpan * pixelsPerYear + viewportWidth;

  const centerYearOnTimeline = useCallback(
    (year: number, zoom = pixelsPerYear) => {
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
    [pixelsPerYear, yearSpan],
  );

  function updateZoom(nextZoom: number) {
    const clampedZoom = clamp(nextZoom, minimumZoom, maximumZoom);
    const viewport = viewportRef.current;

    if (!viewport) {
      setPixelsPerYear(clampedZoom);
      return;
    }

    const centeredYear = clamp(
      minimumYear + viewport.scrollLeft / pixelsPerYear,
      minimumYear,
      maximumYear,
    );

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
    if (viewportWidth === 0) {
      return;
    }

    centerYearOnTimeline(selectedYear);
  }, [centerYearOnTimeline, selectedYear, viewportWidth, pixelsPerYear]);

  function handleScroll() {
    const viewport = viewportRef.current;

    if (!viewport || syncScrollRef.current) {
      return;
    }

    const year = clamp(
      Math.round(minimumYear + viewport.scrollLeft / pixelsPerYear),
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
    updateZoom(pixelsPerYear * zoomFactor);
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
      zoom: pixelsPerYear,
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

    setPixelsPerYear(clamp(nextZoom, minimumZoom, maximumZoom));

    requestAnimationFrame(() => {
      centerYearOnTimeline(pinchStateRef.current?.centerYear ?? selectedYear, clamp(nextZoom, minimumZoom, maximumZoom));
    });
  }

  function handleTouchEnd() {
    pinchStateRef.current = null;
  }

  return (
    <div className="w-full overflow-hidden rounded-[1.4rem] border-[4px] border-white bg-[#132041]/85 px-2 py-3">
      <div className="overflow-hidden rounded-[1.2rem] border border-white/10 bg-[#162348]">
        <div className="mb-2 flex items-center justify-between px-3 text-[0.65rem] uppercase tracking-[0.26em] text-white/52">
          <span>{minimumYear}</span>
          <span>Pinch or ctrl-scroll to zoom</span>
          <span>{maximumYear}</span>
        </div>

        <div className="relative max-w-full overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_23%,rgba(255,255,255,0.08)_24%,transparent_25%,transparent_73%,rgba(255,255,255,0.08)_74%,transparent_75%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/65" />
          <div className="pointer-events-none absolute left-1/2 top-0 z-20 h-full w-px -translate-x-1/2 bg-[#f7b63d]" />
          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled}
            aria-label={`Guess ${selectedYear}`}
            className={[
              "absolute left-1/2 top-3 z-30 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-[#f7b63d] transition",
              disabled ? "cursor-default opacity-70" : "cursor-pointer hover:scale-110 active:scale-95",
            ].join(" ")}
          />

          <div
            ref={viewportRef}
            onScroll={handleScroll}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={[
              "timeline-viewport relative h-24 max-w-full overflow-x-auto overflow-y-hidden",
              disabled ? "pointer-events-none opacity-70" : "",
            ].join(" ")}
          >
            <div className="relative h-full" style={{ width: `${contentWidth}px` }}>
              {typeof revealedYear === "number" ? (
                <div
                  className="pointer-events-none absolute top-0 z-10 h-full"
                  style={{
                    left: `${(clamp(revealedYear, minimumYear, maximumYear) - minimumYear) * pixelsPerYear + viewportWidth / 2}px`,
                    transform: "translateX(-50%)",
                  }}
                >
                  <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#39d353]" />
                  <div className="absolute left-1/2 top-3 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-[#39d353]" />
                </div>
              ) : null}

              {years.map((year) => {
                const offset = (year - minimumYear) * pixelsPerYear + viewportWidth / 2;
                const isDecade = year % 10 === 0;
                const isHalfDecade = year % 5 === 0;
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

  const currentQuestion = rounds[currentRound];
  const currentGuess = guesses[currentRound];
  const roundBadge = getRoundBadge(currentRound);
  const exactHits = guesses.filter((guess) => guess.difference === 0).length;
  const rawScore = guesses.reduce((sum, guess) => sum + guess.roundScore, 0);
  const totalScore = rawScore * finalScoreMultiplier;
  const averageScore = guesses.length > 0 ? Math.round(rawScore / guesses.length) : 0;
  const isFinished = currentRound >= totalRounds;
  function startGame() {
    setHasStarted(true);
    setCurrentRound(0);
    setGuesses([]);
    setSelectedYear(defaultTimelineYear);
  }

  function handleGuess() {
    if (!currentQuestion || currentGuess) {
      return;
    }

    const difference = Math.abs(selectedYear - currentQuestion.correctAnswer);

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
      <main className="min-h-screen bg-[#162348] px-4 py-6 text-white sm:px-8 sm:py-8">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col">
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

          <div className="mt-8 grid gap-3">
            {rounds.map((question, index) => {
              const guess = guesses[index];

              return (
                <div
                  key={question.id}
                  className="flex items-center justify-between rounded-[1.1rem] border-[3px] border-white px-4 py-3 text-sm sm:px-5 sm:text-lg"
                >
                  <span className="tracking-[0.18em] text-white/72">
                    ROUND {index + 1}
                  </span>
                  <span className="text-white">
                    {guess?.selectedYear ?? "No guess"} / {question.correctAnswer}
                    {guess ? ` (${guess.roundScore} pts)` : ""}
                  </span>
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
    <section className="flex flex-1 flex-col py-1">
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

      <div className="grid flex-1 grid-rows-[auto_auto_auto_1fr] justify-items-center gap-4 py-3">
        <div className="w-full max-w-3xl">
          <div className="relative min-w-0 rounded-[1rem] border border-white/14 bg-white/6 px-3 py-1.5 text-left">
            <p className="text-xs uppercase tracking-[0.3em] text-white/58">
              {currentGuess ? "Your result" : "Photo description"}
            </p>
            <p className="mt-1 break-words pr-32 text-base leading-5 text-white/88">
              {currentGuess
                ? currentGuess.difference === 0
                  ? `Exact hit. ${currentGuess.roundScore} points.`
                  : `${currentGuess.selectedYear < currentQuestion.correctAnswer ? "Too early" : "Too late"} by ${currentGuess.difference} year${currentGuess.difference === 1 ? "" : "s"}. ${currentGuess.roundScore} points. The correct year was ${currentQuestion.correctAnswer}.`
                : currentQuestion.photoCaption ?? currentQuestion.alt}
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

        <div className="w-full max-w-3xl">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.4rem] border-[4px] border-white bg-[#132041]">
            <Image
              src={currentQuestion.imageUrl}
              alt={currentQuestion.alt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 900px"
              className="object-contain"
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
              revealedYear={currentGuess ? currentQuestion.correctAnswer : undefined}
            />
          </div>
        </div>

        <div className="min-h-[1rem] w-full max-w-3xl" />

        <div className="min-h-[2.5rem] w-full max-w-3xl">
          {currentGuess && currentQuestion.photoCredit ? (
            <div className="mx-auto w-full max-w-3xl text-center text-sm leading-6 text-white/74">
              <p className="font-medium text-white/88">{currentQuestion.photoCredit}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>,
  );
}
