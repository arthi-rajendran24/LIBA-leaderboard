import { NextResponse } from 'next/server';

import {
  emptyScores,
  isHouseId,
  type ScoreEntry,
  type Scoreboard,
} from '@/lib/scoreboard';
import { redisCommand } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const SCORES_KEY = 'liba:house-cup:scores:v1';
const HISTORY_KEY = 'liba:house-cup:history:v1';

const recordScript = `
local next_score = redis.call('HINCRBY', KEYS[1], ARGV[1], ARGV[2])
redis.call('LPUSH', KEYS[2], ARGV[3])
redis.call('LTRIM', KEYS[2], 0, 49)
return next_score
`;

const undoScript = `
local entry_json = redis.call('LPOP', KEYS[2])
if not entry_json then return nil end
local entry = cjson.decode(entry_json)
redis.call('HINCRBY', KEYS[1], entry.house, -entry.points)
return entry_json
`;

async function readScoreboard(): Promise<Scoreboard> {
  const [rawScores, rawHistory] = await Promise.all([
    redisCommand<Array<string>>(['HGETALL', SCORES_KEY]),
    redisCommand<Array<string>>(['LRANGE', HISTORY_KEY, 0, 49]),
  ]);

  const scores = { ...emptyScores };
  for (let index = 0; index < rawScores.length; index += 2) {
    const house = rawScores[index];
    if (isHouseId(house)) scores[house] = Number(rawScores[index + 1]) || 0;
  }

  const history = rawHistory.flatMap((value) => {
    try {
      const entry = JSON.parse(value) as ScoreEntry;
      return isHouseId(entry.house) ? [entry] : [];
    } catch {
      return [];
    }
  });

  return { scores, history };
}

function response(data: Scoreboard, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

export async function GET() {
  try {
    return response(await readScoreboard());
  } catch (error) {
    console.error('Failed to load scoreboard', error);
    return NextResponse.json(
      { error: 'The shared scorebook is temporarily unavailable.' },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as Partial<ScoreEntry>;
    const points = Number(input.points);
    if (
      !isHouseId(input.house) ||
      !Number.isInteger(points) ||
      points === 0 ||
      Math.abs(points) > 10000
    ) {
      return NextResponse.json(
        { error: 'Choose a house and enter 1 to 10,000 whole points.' },
        { status: 400 },
      );
    }

    const entry: ScoreEntry = {
      id: crypto.randomUUID(),
      house: input.house,
      points,
      note: typeof input.note === 'string' ? input.note.trim().slice(0, 80) : '',
      createdAt: new Date().toISOString(),
    };

    await redisCommand<number>([
      'EVAL',
      recordScript,
      2,
      SCORES_KEY,
      HISTORY_KEY,
      entry.house,
      entry.points,
      JSON.stringify(entry),
    ]);

    return response(await readScoreboard());
  } catch (error) {
    console.error('Failed to record points', error);
    return NextResponse.json(
      { error: 'The points could not be saved. Please try again.' },
      { status: 503 },
    );
  }
}

export async function DELETE() {
  try {
    await redisCommand<string | null>([
      'EVAL',
      undoScript,
      2,
      SCORES_KEY,
      HISTORY_KEY,
    ]);
    return response(await readScoreboard());
  } catch (error) {
    console.error('Failed to undo points', error);
    return NextResponse.json(
      { error: 'The last change could not be undone. Please try again.' },
      { status: 503 },
    );
  }
}
