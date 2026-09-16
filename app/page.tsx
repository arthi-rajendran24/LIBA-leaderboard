'use client';
/* oxlint-disable react-compiler */

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Crown,
  History,
  Minus,
  Plus,
  Shield,
  Sparkles,
  Trophy,
  Undo2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  emptyScores,
  type HouseId,
  type ScoreEntry as Entry,
  type Scoreboard,
} from '@/lib/scoreboard';

const houses: Array<{
  id: HouseId;
  name: string;
  animal: string;
  colors: string;
  crest: string;
  virtues: string;
}> = [
  {
    id: 'gryffindor',
    name: 'Gryffindor',
    animal: 'Lion',
    colors: 'from-[#7f1422] to-[#3d0910]',
    crest: '/crests/gryffindor.png',
    virtues: 'Courage · Nerve · Chivalry',
  },
  {
    id: 'slytherin',
    name: 'Slytherin',
    animal: 'Serpent',
    colors: 'from-[#14543b] to-[#06251b]',
    crest: '/crests/slytherin.png',
    virtues: 'Ambition · Cunning · Pride',
  },
  {
    id: 'ravenclaw',
    name: 'Ravenclaw',
    animal: 'Eagle',
    colors: 'from-[#164c77] to-[#071d31]',
    crest: '/crests/ravenclaw.png',
    virtues: 'Wisdom · Wit · Learning',
  },
  {
    id: 'hufflepuff',
    name: 'Hufflepuff',
    animal: 'Badger',
    colors: 'from-[#b78613] to-[#4b3504]',
    crest: '/crests/hufflepuff.png',
    virtues: 'Loyalty · Patience · Dedication',
  },
];
export default function Home() {
  const [scores, setScores] = useState(emptyScores);
  const [history, setHistory] = useState<Entry[]>([]);
  const [selectedHouse, setSelectedHouse] = useState<HouseId>('gryffindor');
  const [points, setPoints] = useState('10');
  const [note, setNote] = useState('');
  const [mode, setMode] = useState<'award' | 'deduct'>('award');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function loadScoreboard(showError = true) {
      try {
        const response = await fetch('/api/scoreboard', { cache: 'no-store' });
        if (!response.ok) throw new Error('Scorebook unavailable');
        const data = (await response.json()) as Scoreboard;
        if (active) {
          setScores(data.scores);
          setHistory(data.history);
        }
      } catch {
        if (active && showError)
          setMessage('The shared scorebook could not be loaded. Please refresh.');
      } finally {
        if (active) setReady(true);
      }
    }

    void loadScoreboard();
    const interval = window.setInterval(() => void loadScoreboard(false), 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  async function saveChange(
    method: 'POST' | 'DELETE',
    body?: { house: HouseId; points: number; note: string },
  ) {
    setSaving(true);
    try {
      const response = await fetch('/api/scoreboard', {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await response.json()) as Scoreboard & { error?: string };
      if (!response.ok) throw new Error(data.error || 'Scorebook unavailable');
      setScores(data.scores);
      setHistory(data.history);
      return data;
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    type ToolInput = { house?: unknown; points?: unknown; note?: unknown };
    type ModelContext = {
      registerTool: (
        tool: {
          name: string;
          title: string;
          description: string;
          inputSchema: object;
          annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
          execute: (input: ToolInput) => Promise<object>;
        },
        options: { signal: AbortSignal },
      ) => void | Promise<void>;
    };
    const modelContext = (
      document as Document & { modelContext?: ModelContext }
    ).modelContext;
    if (!modelContext?.registerTool) return;

    const lifecycle = new AbortController();
    void Promise.resolve(
      modelContext.registerTool(
        {
          name: 'record_house_points',
          title: 'Record house points',
          description:
            'Add or deduct LIBA House Cup points. Use a positive number to award points or a negative number to deduct them.',
          inputSchema: {
            type: 'object',
            properties: {
              house: { type: 'string', enum: houses.map((house) => house.id) },
              points: { type: 'integer', minimum: -10000, maximum: 10000 },
              note: { type: 'string', maxLength: 80 },
            },
            required: ['house', 'points'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          async execute(input) {
            const house = input.house;
            const pointChange = input.points;
            const entryNote =
              typeof input.note === 'string'
                ? input.note.trim().slice(0, 80)
                : '';
            const validHouse = houses.some((item) => item.id === house);
            if (!validHouse || typeof house !== 'string')
              throw new Error('Choose a valid house.');
            if (
              !Number.isInteger(pointChange) ||
              pointChange === 0 ||
              Math.abs(pointChange as number) > 10000
            ) {
              throw new Error(
                'Points must be a non-zero whole number between -10,000 and 10,000.',
              );
            }
            const houseId = house as HouseId;
            const change = pointChange as number;
            const data = await saveChange('POST', {
              house: houseId,
              points: change,
              note: entryNote,
            });
            setMessage(
              `${change > 0 ? 'Awarded' : 'Deducted'} ${Math.abs(change)} points ${change > 0 ? 'to' : 'from'} ${houses.find((item) => item.id === houseId)?.name}.`,
            );
            return { house: houseId, change, newScore: data.scores[houseId] };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);

    return () => lifecycle.abort();
  }, []);

  const rankedHouses = useMemo(
    () =>
      houses
        .map((house) => ({ ...house, score: scores[house.id] }))
        .sort((a, b) => b.score - a.score),
    [scores],
  );
  const activeHouse = houses.find((house) => house.id === selectedHouse)!;
  const clearLeader =
    rankedHouses[0].score > 0 && rankedHouses[0].score > rankedHouses[1].score;

  async function recordPoints(event: { preventDefault: () => void }) {
    event.preventDefault();
    const entered = Number.parseInt(points, 10);
    if (!Number.isFinite(entered) || entered <= 0) {
      setMessage('Enter a whole number greater than zero.');
      return;
    }
    const change = mode === 'award' ? entered : -entered;
    try {
      await saveChange('POST', {
        house: selectedHouse,
        points: change,
        note: note.trim(),
      });
      setNote('');
      const houseName = houses.find((house) => house.id === selectedHouse)?.name;
      setMessage(
        `${mode === 'award' ? 'Awarded' : 'Deducted'} ${entered} points ${mode === 'award' ? 'to' : 'from'} ${houseName}.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'The points could not be saved.',
      );
    }
  }

  async function undoLast() {
    if (!history.length) return;
    try {
      await saveChange('DELETE');
      setMessage('The last points change was undone.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'The last change could not be undone.',
      );
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#080a10] text-[#f5ead0]">
      <div className="ambient-light" aria-hidden="true" />
      <header className="relative z-10 border-b border-[#d5b765]/20 bg-[#090b12]/70 px-5 py-4 backdrop-blur-xl sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full border border-[#d5b765]/50 bg-[#d5b765]/10 text-[#f1d788]">
              <Trophy className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-display text-xl font-semibold tracking-wide sm:text-2xl">
                LIBA House Cup
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-[#c9b98f]">
                Workshop leaderboard
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-sm text-[#c9b98f] sm:flex">
            <span className={`save-dot ${ready ? 'is-ready' : ''}`} />
            {ready ? 'Synced across devices' : 'Opening shared scorebook…'}
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-[1480px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <section className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[#dfc774]">
              <Trophy className="size-4" aria-hidden="true" />
              <span className="text-sm font-semibold uppercase tracking-[0.2em]">
                Live standings
              </span>
            </div>
            <h1 className="font-display text-4xl leading-none text-[#fff7e6] sm:text-5xl lg:text-6xl">
              The Great Hall Scoreboard
            </h1>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#bdb49e] sm:text-base">
            Honour brilliant thinking, bold teamwork and generous collaboration.
            Every change is saved to the shared scorebook for every device.
          </p>
        </section>

        <section
          className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="House standings"
        >
          {rankedHouses.map((house, index) => (
            <article
              key={house.id}
              data-house={house.id}
              className={`house-card group relative overflow-hidden rounded-[1.6rem] border bg-gradient-to-br ${house.colors} p-5 sm:p-6`}
            >
              <div className="house-pattern" aria-hidden="true" />
              <div className="relative flex items-center justify-between">
                <span className="rank-badge">Rank {index + 1}</span>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">
                  {house.animal}
                </span>
              </div>
              <div className="crest-stage relative mx-auto mt-1 grid h-44 place-items-center">
                <div className="crest-glow" aria-hidden="true" />
                <Image
                  src={house.crest}
                  alt={`${house.name} ${house.animal} crest`}
                  width={160}
                  height={160}
                  className="house-crest relative z-10 h-40 w-40 object-contain drop-shadow-2xl"
                />
                {index === 0 && clearLeader ? (
                  <Crown
                    className="leader-crown absolute right-4 top-2 z-20 size-7 text-[#f7d872]"
                    aria-label="Leading house"
                  />
                ) : null}
              </div>
              <div className="relative text-center">
                <h2 className="font-display text-[1.72rem] font-semibold tracking-wide text-white">
                  {house.name}
                </h2>
                <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/48">
                  {house.virtues}
                </p>
              </div>
              <div className="relative mt-5 flex items-end justify-between border-t border-white/12 pt-4">
                <div>
                  <p className="font-display text-4xl font-bold tabular-nums text-white sm:text-5xl">
                    {house.score.toLocaleString('en-IN')}
                  </p>
                  <p className="mt-1 text-sm uppercase tracking-[0.16em] text-white/60">
                    points
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  onClick={() => {
                    setSelectedHouse(house.id);
                    document.getElementById('points-entry')?.focus();
                  }}
                >
                  Add points
                </button>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
          <div className="score-panel rounded-[1.5rem] border border-[#d5b765]/25 bg-[#11131d]/90 p-5 shadow-2xl shadow-black/20 sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="active-crest-wrap grid size-14 shrink-0 place-items-center rounded-xl bg-[#d5b765]/10 text-[#e4ca77]">
                <Image
                  src={activeHouse.crest}
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 object-contain"
                />
              </span>
              <div>
                <h2 className="font-display text-2xl text-[#fff7e6]">
                  Record house points
                </h2>
                <p className="text-sm text-[#aaa28f]">
                  Choose a house, enter the points, then update the cup.
                </p>
              </div>
            </div>
            <form onSubmit={recordPoints} className="grid gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <label
                  htmlFor="house-select"
                  className="grid gap-2 text-sm font-semibold text-[#ddd2b9]"
                >
                  House
                  <NativeSelect
                    id="house-select"
                    value={selectedHouse}
                    onChange={(event) =>
                      setSelectedHouse(event.target.value as HouseId)
                    }
                    className="w-full"
                    aria-label="Select a house"
                  >
                    {houses.map((house) => (
                      <NativeSelectOption key={house.id} value={house.id}>
                        {house.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </label>
                <label
                  htmlFor="points-entry"
                  className="grid gap-2 text-sm font-semibold text-[#ddd2b9]"
                >
                  Points
                  <Input
                    id="points-entry"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    value={points}
                    onChange={(event) => setPoints(event.target.value)}
                    className="h-11 border-[#d5b765]/25 bg-black/20 px-4 text-lg text-[#fff7e6]"
                  />
                </label>
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-semibold text-[#ddd2b9]">
                  Action
                </span>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-black/20 p-1.5">
                  <button
                    type="button"
                    className={`mode-button ${mode === 'award' ? 'is-active' : ''}`}
                    onClick={() => setMode('award')}
                    aria-pressed={mode === 'award'}
                  >
                    <Plus className="size-4" aria-hidden="true" /> Award
                  </button>
                  <button
                    type="button"
                    className={`mode-button ${mode === 'deduct' ? 'is-active' : ''}`}
                    onClick={() => setMode('deduct')}
                    aria-pressed={mode === 'deduct'}
                  >
                    <Minus className="size-4" aria-hidden="true" /> Deduct
                  </button>
                </div>
              </div>
              <label
                htmlFor="points-reason"
                className="grid gap-2 text-sm font-semibold text-[#ddd2b9]"
              >
                Reason{' '}
                <span className="font-normal text-[#817a6c]">(optional)</span>
                <Input
                  id="points-reason"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={80}
                  placeholder="Example: Best team presentation"
                  className="h-11 border-[#d5b765]/25 bg-black/20 px-4 text-[#fff7e6] placeholder:text-[#746e61]"
                />
              </label>
              <Button
                type="submit"
                size="lg"
                disabled={!ready || saving}
                className="h-12 bg-[#d9bd65] text-base font-bold text-[#171208] hover:bg-[#f0d87f]"
              >
                <Sparkles className="size-4" aria-hidden="true" />
                {saving
                  ? 'Saving…'
                  : mode === 'award'
                    ? 'Award points'
                    : 'Deduct points'}
              </Button>
              <p className="min-h-5 text-sm text-[#cfc2a2]" aria-live="polite">
                {message}
              </p>
            </form>
          </div>

          <aside
            className="rounded-[1.5rem] border border-white/10 bg-[#0d0f17]/90 p-5 sm:p-7"
            aria-label="Recent point changes"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <History className="size-5 text-[#d9bd65]" aria-hidden="true" />
                <h2 className="font-display text-2xl text-[#fff7e6]">
                  Recent awards
                </h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={undoLast}
                disabled={!history.length || saving}
                className="text-[#c9b98f] hover:bg-white/10 hover:text-white"
              >
                <Undo2 className="size-4" aria-hidden="true" /> Undo last
              </Button>
            </div>
            {history.length === 0 ? (
              <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-white/10 px-6 text-center">
                <div>
                  <Shield
                    className="mx-auto mb-3 size-9 text-[#6f6859]"
                    aria-hidden="true"
                  />
                  <p className="font-semibold text-[#d8ccb1]">
                    The scorebook is ready
                  </p>
                  <p className="mt-1 text-sm text-[#827b6d]">
                    Your first points change will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <ol className="history-list max-h-[380px] space-y-2 overflow-y-auto pr-1">
                {history.map((entry) => {
                  const house = houses.find((item) => item.id === entry.house)!;
                  return (
                    <li
                      key={entry.id}
                      className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.035] p-3.5"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-black/20">
                        <Image
                          src={house.crest}
                          alt=""
                          width={36}
                          height={36}
                          className="h-9 w-9 object-contain"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="font-semibold text-[#eee2c9]">
                            {house.name}
                          </p>
                          <p
                            className={`font-bold tabular-nums ${entry.points > 0 ? 'text-[#82d6a2]' : 'text-[#ef8f8f]'}`}
                          >
                            {entry.points > 0 ? '+' : ''}
                            {entry.points}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-xs text-[#817a6c]">
                          <p className="truncate">
                            {entry.note ||
                              (entry.points > 0
                                ? 'Points awarded'
                                : 'Points deducted')}
                          </p>
                          <time dateTime={entry.createdAt} className="shrink-0">
                            {new Intl.DateTimeFormat('en-IN', {
                              hour: 'numeric',
                              minute: '2-digit',
                            }).format(new Date(entry.createdAt))}
                          </time>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </aside>
        </section>
      </div>
      <footer className="relative z-10 border-t border-white/8 px-5 py-5 text-center text-sm text-[#756f62]">
        LIBA House Cup · Shared live scorebook
      </footer>
    </main>
  );
}
