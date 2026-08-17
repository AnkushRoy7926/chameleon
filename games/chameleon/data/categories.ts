export interface Category {
  name: string;
  answers: string[];
}

export const CATEGORIES: Category[] = [
  {
    name: "MCU",
    answers: [
      "M'Baku",
      "Shuri",
      "Everett Ross",
      "Ulysses Klaue",
      "Nebula",
      "Valkyrie",
      "Korg",
      "Grandmaster",
      "He Who Remains",
      "Wong",
      "Pepper Potts",
      "Happy Hogan",
      "Scott Lang",
      "Hope van Dyne",
      "Shang-Chi",
      "Mysterio",
      "Vulture",
      "Hawkeye",
      "Nick Fury",
      "Loki",
      "Gamora",
      "Rocket",
      "Groot",
      "Hela",
      "Doctor Strange",
      "Thor",
      "Captain America",
      "Iron Man",
      "Black Widow",
      "Spider-Man",
      "Star-Lord",
      "Vision",
      "Scarlet Witch",
      "Ego",
      "Daredevil",
      "Moon Knight",
      "Taskmaster",
      "Red Skull",
      "Ronan"
    ],
  },
];

export function getRandomCategory(): Category {
  return CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
}

export function getRandomAnswer(category: Category): string {
  return category.answers[
    Math.floor(Math.random() * category.answers.length)
  ];
}
