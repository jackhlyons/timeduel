export type Question = {
  id: number;
  imageUrl: string;
  alt: string;
  photoCaption?: string;
  photoCredit?: string;
  correctAnswer: number;
};

export const questions: Question[] = [
  {
    id: 1,
    imageUrl: "/images/photo1.jpeg",
    alt: "Historic street scene",
    photoCaption:
      "Vladimir Lenin delivering a speech to Red Army soldiers in Moscow's Sverdlov Square (now Teatralnaya Square) just before their departure to the front during the Polish-Soviet War.",
    photoCredit: "Grigory Petrovich Goldstein, Public domain, via Wikimedia Commons",
    correctAnswer: 1920,
  },
  {
    id: 2,
    imageUrl: "/images/photo2.jpeg",
    alt: "Modern city moment",
    correctAnswer: 1994,
  },
  {
    id: 3,
    imageUrl: "/images/photo3.jpeg",
    alt: "Black and white archival photograph",
    correctAnswer: 1940,
  },
  {
    id: 4,
    imageUrl: "/images/photo4.jpeg",
    alt: "Crowded event photograph",
    correctAnswer: 1970,
  },
  {
    id: 5,
    imageUrl: "/images/photo5.jpeg",
    alt: "Colour historical photograph",
    photoCaption:
      "Ivana Trump shaking hands with Fahd of Saudi Arabia during a state visit to the White House.",
    photoCredit: "Michael Evans, Public domain, via Wikimedia Commons",
    correctAnswer: 1985,
  },
];
