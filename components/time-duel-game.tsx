"use client";

import Image from "next/image";
import { useState } from "react";

import { questions } from "@/data/questions";

type GuessRecord = {
  questionId: number;
  selectedYear: number;
  isCorrect: boolean;
};

const rounds = questions.slice(0, 5);
const totalRounds = rounds.length;

export function TimeDuelGame() {
  const [hasStarted, setHasStarted] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [guesses, setGuesses] = useState<GuessRecord[]>([]);

  const currentQuestion = rounds[currentRound];
  const currentGuess = guesses[currentRound];
  const score = guesses.filter((guess) => guess.isCorrect).length;
  const isFinished = currentRound >= totalRounds;

  function startGame() {
    setHasStarted(true);
    setCurrentRound(0);
    setGuesses([]);
  }

  function handleGuess(selectedYear: number) {
    if (!currentQuestion || currentGuess) {
      return;
    }

    setGuesses((previous) => [
      ...previous,
      {
        questionId: currentQuestion.id,
        selectedYear,
        isCorrect: selectedYear === currentQuestion.correctAnswer,
      },
    ]);
  }

  function advanceRound() {
    setCurrentRound((round) => round + 1);
  }

  if (!hasStarted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#c9652f] px-4 py-6 text-stone-950">
        <section className="w-full max-w-2xl rounded-[2rem] border border-black/10 bg-white/75 p-8 shadow-[0_24px_80px_rgba(40,22,10,0.25)] backdrop-blur">
          <p className="text-center text-5xl font-black uppercase tracking-[0.16em] text-amber-800 sm:text-7xl">
            TimeDuel
          </p>
          <h1 className="mt-6 text-center text-3xl font-black uppercase tracking-tight text-balance sm:text-4xl">
            Guess the year from the photo.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-center text-lg leading-7 text-stone-700">
            Five rounds. One photo each round. Pick from three years and see
            how many you get right.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={startGame}
              className="inline-flex h-14 items-center justify-center rounded-full bg-stone-950 px-8 text-base font-semibold text-white transition hover:bg-stone-800"
            >
              Start duel
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (isFinished) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#c9652f] px-4 py-6 text-white">
        <section className="w-full max-w-3xl rounded-[2rem] border border-white/15 bg-black/30 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-200/80">
            Final score
          </p>
          <h1 className="mt-3 text-6xl font-black tracking-tight">
            {score}/{totalRounds}
          </h1>
          <p className="mt-3 text-lg text-white/80">
            {score === totalRounds
              ? "Perfect run."
              : "Tap replay to run the five rounds again."}
          </p>
          <div className="mt-8 grid gap-3">
            {rounds.map((question, index) => {
              const guess = guesses[index];

              return (
                <div
                  key={question.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/8 px-4 py-3"
                >
                  <span className="text-sm uppercase tracking-[0.2em] text-white/65">
                    Round {index + 1}
                  </span>
                  <span className="text-sm text-white/80">
                    {guess?.selectedYear ?? "No guess"} / {question.correctAnswer}
                  </span>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={startGame}
            className="mt-8 inline-flex h-14 items-center justify-center rounded-full bg-white px-8 text-base font-semibold text-stone-950 transition hover:bg-amber-100"
          >
            Play again
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#c9652f] px-3 py-3 text-stone-950 sm:px-4 sm:py-4">
      <section className="mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-6xl grid-rows-[auto_auto_1fr_auto] gap-3 rounded-[2rem] border border-black/10 bg-white/72 p-3 shadow-[0_28px_90px_rgba(46,20,11,0.2)] backdrop-blur sm:min-h-[calc(100vh-2rem)] sm:p-4">
        <header className="flex items-center justify-between gap-3 rounded-[1.5rem] bg-white/70 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-800">
              TimeDuel
            </p>
            <h1 className="text-xl font-black uppercase tracking-tight">
              Round {currentRound + 1} of {totalRounds}
            </h1>
          </div>
          <div className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white">
            Score {score}
          </div>
        </header>

        <p className="px-1 text-center text-sm font-medium text-stone-700 sm:text-base">
          Study the photo, then choose the year.
        </p>

        <div className="relative min-h-0 overflow-hidden rounded-[1.75rem] border border-black/10 bg-stone-950/90">
          <Image
            src={currentQuestion.imageUrl}
            alt={currentQuestion.alt}
            fill
            priority
            sizes="100vw"
            className="object-contain"
          />
        </div>

        {currentGuess && currentQuestion.photoCredit ? (
          <div className="px-2 text-center text-xs leading-5 text-stone-700 sm:text-sm">
            {currentQuestion.photoCaption ? (
              <p>{currentQuestion.photoCaption}</p>
            ) : null}
            <p className="font-medium">{currentQuestion.photoCredit}</p>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          {currentQuestion.options.map((option) => {
            const isSelected = currentGuess?.selectedYear === option;
            const isCorrect = option === currentQuestion.correctAnswer;
            const showResult = Boolean(currentGuess);

            return (
              <button
                key={option}
                type="button"
                onClick={() => handleGuess(option)}
                disabled={showResult}
                className={[
                  "flex min-h-16 items-center justify-center rounded-[1.5rem] border px-4 py-4 text-lg font-black transition",
                  showResult && isCorrect
                    ? "border-emerald-600 bg-emerald-500 text-white"
                    : showResult && isSelected
                      ? "border-rose-700 bg-rose-600 text-white"
                      : "border-black/10 bg-white/80 text-stone-950 hover:bg-white",
                  showResult ? "cursor-default" : "cursor-pointer",
                ].join(" ")}
              >
                {option}
              </button>
            );
          })}
        </div>

        {currentGuess ? (
          <div className="flex flex-col items-center gap-3 pb-1">
            <p className="text-center text-base font-semibold text-stone-800">
              {currentGuess.isCorrect
                ? "Correct."
                : `Wrong. The correct year was ${currentQuestion.correctAnswer}.`}
            </p>
            <button
              type="button"
              onClick={advanceRound}
              className="inline-flex h-12 items-center justify-center rounded-full bg-stone-950 px-6 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              {currentRound === totalRounds - 1 ? "See results" : "Next round"}
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
