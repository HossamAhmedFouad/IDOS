"use client";

import { useEffect, useState, useCallback } from "react";
import type { AppProps } from "@/lib/types";
import { readFile, writeFile } from "@/lib/file-system";

const DEFAULT_PATH = "/quiz/cards.json";

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

function loadCardsFromJson(json: string): Flashcard[] {
  try {
    const data = JSON.parse(json);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function QuizApp({ config }: AppProps) {
  const filePath = (config?.filePath as string | undefined) ?? DEFAULT_PATH;
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      const text = await readFile(filePath);
      setCards(loadCardsFromJson(text));
      setCurrentIndex(0);
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [filePath]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const saveCards = useCallback(
    async (newCards: Flashcard[]) => {
      setSaving(true);
      try {
        await writeFile(filePath, JSON.stringify(newCards, null, 2));
      } finally {
        setSaving(false);
      }
    },
    [filePath]
  );

  const addCard = useCallback(() => {
    const f = front.trim();
    const b = back.trim();
    if (!f || !b) return;
    const newCard: Flashcard = {
      id: `card-${Date.now()}`,
      front: f,
      back: b,
    };
    const newCards = [...cards, newCard];
    setCards(newCards);
    saveCards(newCards);
    setFront("");
    setBack("");
    setShowForm(false);
  }, [front, back, cards, saveCards]);

  const deleteCard = useCallback(
    (id: string) => {
      const newCards = cards.filter((c) => c.id !== id);
      setCards(newCards);
      saveCards(newCards);
      if (currentIndex >= newCards.length && newCards.length > 0) {
        setCurrentIndex(Math.max(0, newCards.length - 1));
      } else if (newCards.length === 0) {
        setCurrentIndex(0);
      }
    },
    [cards, currentIndex, saveCards]
  );

  const currentCard = cards[currentIndex];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4">
      {saving && (
        <div className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">Saving...</div>
      )}
      {cards.length === 0 && !showForm ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No flashcards yet</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-600 dark:hover:bg-zinc-500"
          >
            Add first card
          </button>
        </div>
      ) : showForm ? (
        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="Front (question)"
            className="rounded border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <input
            type="text"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Back (answer)"
            className="rounded border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addCard}
              className="rounded bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-600"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFront("");
                setBack("");
              }}
              className="rounded border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              {currentIndex + 1} / {cards.length}
            </span>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              + Add card
            </button>
          </div>
          <button
            type="button"
            onClick={() => setFlipped(!flipped)}
            className="flex flex-1 flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-800"
          >
            <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              {flipped ? currentCard.back : currentCard.front}
            </p>
            <span className="mt-2 text-xs text-zinc-500">Click to flip</span>
          </button>
          <div className="mt-4 flex justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setCurrentIndex((i) => Math.max(0, i - 1));
                setFlipped(false);
              }}
              disabled={currentIndex === 0}
              className="rounded border border-zinc-200 px-4 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => deleteCard(currentCard.id)}
              className="rounded px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentIndex((i) => Math.min(cards.length - 1, i + 1));
                setFlipped(false);
              }}
              disabled={currentIndex === cards.length - 1}
              className="rounded border border-zinc-200 px-4 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
