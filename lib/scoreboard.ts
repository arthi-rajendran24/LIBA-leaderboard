export const houseIds = [
  'gryffindor',
  'slytherin',
  'ravenclaw',
  'hufflepuff',
] as const;

export type HouseId = (typeof houseIds)[number];
export type Scores = Record<HouseId, number>;

export type ScoreEntry = {
  id: string;
  house: HouseId;
  points: number;
  note: string;
  createdAt: string;
};

export type Scoreboard = {
  scores: Scores;
  history: ScoreEntry[];
};

export const emptyScores: Scores = {
  gryffindor: 0,
  slytherin: 0,
  ravenclaw: 0,
  hufflepuff: 0,
};

export function isHouseId(value: unknown): value is HouseId {
  return typeof value === 'string' && houseIds.includes(value as HouseId);
}
