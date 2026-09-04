export type Event = {
  id: number;
  imageUrl: string;
  imageAlt: string;
  imageType: "photo" | "depiction";
  eventName: string;
  preGuessDescription: string;
  postGuessDescription: string;
  interestingFact?: string;
  year: number;
  wikipediaUrl: string;
  imageCredit: string;
};

export const questions: Event[] = [
  {
    id: 1,
    imageUrl: "/images/photo1.jpeg",
    imageAlt: "Vladimir Lenin delivering a speech to Red Army soldiers in Moscow",
    imageType: "photo",
    eventName: "Lenin's speech to Red Army soldiers",
    preGuessDescription: "What year did this event happen?",
    postGuessDescription:
      "Vladimir Lenin delivering a speech to Red Army soldiers in Moscow's Sverdlov Square (now Teatralnaya Square) just before their departure to the front during the Polish-Soviet War.",
    interestingFact:
      "The speech was delivered from a wooden platform in Sverdlov Square, now known as Teatralnaya Square.",
    year: 1920,
    wikipediaUrl: "https://en.wikipedia.org/wiki/Polish%E2%80%93Soviet_War",
    imageCredit: "Grigory Petrovich Goldstein, Public domain, via Wikimedia Commons",
  },
  {
    id: 2,
    imageUrl: "/images/photo2.jpeg",
    imageAlt: "A roadside sign reading Sniper at Work near Sarajevo",
    imageType: "photo",
    eventName: "Siege of Sarajevo",
    preGuessDescription: "What year did this event happen?",
    postGuessDescription:
      "A roadside warning sign marks the danger posed by snipers during the Siege of Sarajevo.",
    year: 1994,
    wikipediaUrl: "https://en.wikipedia.org/wiki/Siege_of_Sarajevo",
    imageCredit: "",
  },
  {
    id: 3,
    imageUrl: "/images/photo3.jpeg",
    imageAlt: "Soldiers walking between the pyramids at Giza, Egypt",
    imageType: "photo",
    eventName: "Soldiers at the Pyramids of Giza",
    preGuessDescription: "What year did this event happen?",
    postGuessDescription:
      "Soldiers walk between the pyramids at Giza during the Second World War era.",
    year: 1940,
    wikipediaUrl: "https://en.wikipedia.org/wiki/Egypt_in_World_War_II",
    imageCredit: "",
  },
  {
    id: 4,
    imageUrl: "/images/photo4.jpeg",
    imageAlt: "Maria-Theresien-Strasse in Innsbruck, Austria",
    imageType: "photo",
    eventName: "Maria-Theresien-Strasse, Innsbruck",
    preGuessDescription: "What year did this event happen?",
    postGuessDescription:
      "A winter street scene on Maria-Theresien-Strasse in Innsbruck, Austria.",
    year: 1970,
    wikipediaUrl: "https://en.wikipedia.org/wiki/Innsbruck",
    imageCredit: "",
  },
  {
    id: 5,
    imageUrl: "/images/photo5.jpeg",
    imageAlt: "Ivana Trump shaking hands with Fahd of Saudi Arabia at the White House",
    imageType: "photo",
    eventName: "Fahd of Saudi Arabia's White House visit",
    preGuessDescription: "What year did this event happen?",
    postGuessDescription:
      "Ivana Trump shaking hands with Fahd of Saudi Arabia during a state visit to the White House.",
    year: 1985,
    wikipediaUrl: "https://en.wikipedia.org/wiki/Fahd_of_Saudi_Arabia",
    imageCredit: "Michael Evans, Public domain, via Wikimedia Commons",
  },
];
