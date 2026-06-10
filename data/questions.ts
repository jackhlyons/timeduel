export type Question = {
  id: number;
  imageUrl: string;
  alt: string;
  photoCaption?: string;
  photoCredit?: string;
  options: [number, number, number];
  correctAnswer: number;
};

export const questions: Question[] = [
  {
    id: 1,
    imageUrl: "/images/photo1.jpeg",
    alt: "Historic street scene",
    options: [1914, 1920, 1926],
    correctAnswer: 1920,
  },
  {
    id: 2,
    imageUrl: "/images/photo2.jpeg",
    alt: "Modern city moment",
    options: [1999, 1994, 2003],
    correctAnswer: 1994,
  },
  {
    id: 3,
    imageUrl: "/images/photo3.jpeg",
    alt: "Black and white archival photograph",
    options: [1920, 1930, 1940],
    correctAnswer: 1940,
  },
  {
    id: 4,
    imageUrl: "/images/photo4.jpeg",
    alt: "Crowded event photograph",
    options: [1964, 1970, 1951],
    correctAnswer: 1970,
  },
  {
    id: 5,
    imageUrl: "/images/photo5.jpeg",
    alt: "Color historical photograph",
    photoCaption:
      "Ivana Trump shaking hands with Fahd of Saudi Arabia during a state visit to the White House.",
    photoCredit: "Michael Evans, Public domain, via Wikimedia Commons",
    options: [1981, 1985, 1983],
    correctAnswer: 1985,
  },
];
