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
const categories = [
  "Classic",
  "Football",
  "Key Events",
  "All Time",
  "Music",
  "More...",
] as const;

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

  function shell(children: React.ReactNode) {
    return (
      <main className="min-h-screen bg-[#101a35] px-4 py-6 text-white sm:px-8 sm:py-8">
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
          className="w-full max-w-5xl rounded-[1.35rem] border-[5px] border-white px-8 py-8 text-center text-5xl font-medium tracking-[-0.04em] text-white transition hover:bg-white/6 sm:px-12 sm:py-10 sm:text-8xl"
        >
          Play Now
        </button>

        <div className="grid w-full max-w-5xl grid-cols-2 justify-items-center gap-x-6 gap-y-7 sm:grid-cols-3">
          {categories.map((category) => (
            <div
              key={category}
              className="rounded-[1rem] border-[4px] border-white px-4 py-2 text-center text-2xl font-medium tracking-[-0.03em] text-white sm:min-w-[12rem] sm:px-5 sm:py-3 sm:text-5xl"
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
            Final score
          </p>
          <h1 className="mt-4 text-center text-6xl font-medium tracking-[-0.06em] text-white sm:text-8xl">
            {score}/{totalRounds}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-center text-lg text-white/78 sm:text-xl">
            {score === totalRounds
              ? "Perfect run."
              : "Run it back and see if you can improve the score."}
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
    <section className="flex flex-1 flex-col py-2">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.38em] text-white/70">
            Round {currentRound + 1} of {totalRounds}
          </p>
          <p className="mt-2 text-base text-white/82">Guess the year from the photo.</p>
        </div>
        <div className="text-right">
          <p className="text-sm uppercase tracking-[0.38em] text-white/70">Score</p>
          <p className="mt-2 text-4xl font-medium tracking-[-0.05em] text-white">
            {score}
          </p>
        </div>
      </header>

      <div className="grid flex-1 grid-rows-[auto_auto_auto_1fr] justify-items-center gap-6 py-8">
        <div className="relative aspect-[4/3] w-full max-w-4xl overflow-hidden rounded-[1.6rem] border-[4px] border-white bg-[#0a1126]">
          <Image
            src={currentQuestion.imageUrl}
            alt={currentQuestion.alt}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 900px"
            className="object-contain"
          />
        </div>

        <div className="grid w-full max-w-4xl gap-4 sm:grid-cols-3">
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
                  "rounded-[1.25rem] border-[4px] px-4 py-5 text-4xl font-medium tracking-[-0.04em] transition",
                  showResult && isCorrect
                    ? "border-[#6fe6a4] bg-[#6fe6a4]/15 text-[#d9ffe9]"
                    : showResult && isSelected
                      ? "border-[#ff8d8d] bg-[#ff8d8d]/12 text-[#ffe3e3]"
                      : "border-white text-white hover:bg-white/6",
                  showResult ? "cursor-default" : "cursor-pointer",
                ].join(" ")}
              >
                {option}
              </button>
            );
          })}
        </div>

        <div className="flex min-h-[9rem] w-full max-w-4xl items-start justify-center">
          {currentGuess ? (
            <div className="w-full max-w-2xl text-center">
              <p className="text-lg text-white">
                {currentGuess.isCorrect
                  ? "Correct."
                  : `Wrong. The correct year was ${currentQuestion.correctAnswer}.`}
              </p>
              <button
                type="button"
                onClick={advanceRound}
                className="mt-4 rounded-[1.15rem] border-[4px] border-white px-8 py-4 text-3xl font-medium tracking-[-0.04em] text-white transition hover:bg-white/6"
              >
                {currentRound === totalRounds - 1 ? "See Results" : "Next Round"}
              </button>
            </div>
          ) : null}
        </div>

        <div className="min-h-[5.5rem] w-full max-w-4xl">
          {currentGuess && currentQuestion.photoCredit ? (
            <div className="mx-auto w-full max-w-3xl text-center text-sm leading-6 text-white/74">
              {currentQuestion.photoCaption ? <p>{currentQuestion.photoCaption}</p> : null}
              <p className="font-medium text-white/88">{currentQuestion.photoCredit}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>,
  );
}
