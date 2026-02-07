"use client";

import {
  readFile,
  writeFile,
  listDirectory,
  createDirectory,
} from "@/lib/file-system";
import type { AppTool } from "@/lib/types/agent";

const QUIZ_ROOT = "/quiz";
const CARDS_FILENAME = "cards.json";

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

function toTopicSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    || "deck";
}

/**
 * Create quiz tools. Quiz tools do not use uiUpdate for now.
 */
export function createQuizTools(appInstanceId: string): AppTool[] {
  return [
    {
      name: "quiz_add_card",
      description: "Add a flashcard to a quiz topic/deck",
      appId: "quiz",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "Topic/deck name (e.g. vocabulary, math)" },
          front: { type: "string", description: "Front of the card (question)" },
          back: { type: "string", description: "Back of the card (answer)" },
        },
        required: ["topic", "front", "back"],
      },
      execute: async (params) => {
        const topic = String(params.topic ?? "").trim();
        const front = String(params.front ?? "").trim();
        const back = String(params.back ?? "").trim();
        if (!topic || !front || !back) {
          return { success: false, error: "topic, front, and back are required" };
        }
        const slug = toTopicSlug(topic);
        const dirPath = `${QUIZ_ROOT}/${slug}`;
        const filePath = `${dirPath}/${CARDS_FILENAME}`;
        try {
          await listDirectory(dirPath);
        } catch {
          await createDirectory(dirPath);
        }
        let cards: Flashcard[];
        try {
          const raw = await readFile(filePath);
          cards = loadCardsFromJson(raw);
        } catch {
          cards = [];
        }
        const newCard: Flashcard = {
          id: `card-${Date.now()}`,
          front,
          back,
        };
        cards.push(newCard);
        await writeFile(filePath, JSON.stringify(cards, null, 2));
        return { success: true, data: newCard };
      },
    },
    {
      name: "quiz_list_cards",
      description: "List flashcards in a quiz topic/deck",
      appId: "quiz",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "Topic/deck name" },
        },
        required: ["topic"],
      },
      execute: async (params) => {
        const topic = String(params.topic ?? "").trim();
        if (!topic) return { success: false, error: "topic is required" };
        const slug = toTopicSlug(topic);
        const filePath = `${QUIZ_ROOT}/${slug}/${CARDS_FILENAME}`;
        let cards: Flashcard[];
        try {
          const raw = await readFile(filePath);
          cards = loadCardsFromJson(raw);
        } catch {
          cards = [];
        }
        return {
          success: true,
          data: { topic: slug, cards, count: cards.length },
        };
      },
    },
    {
      name: "quiz_list_topics",
      description: "List all quiz topics/decks",
      appId: "quiz",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async () => {
        try {
          const names = await listDirectory(QUIZ_ROOT);
          const topics = names.filter((n) => !n.includes(".")).sort((a, b) => a.localeCompare(b));
          return { success: true, data: { topics, count: topics.length } };
        } catch {
          return { success: true, data: { topics: [], count: 0 } };
        }
      },
    },
    {
      name: "quiz_start_session",
      description: "Start a quiz session for a topic (opens/focuses the quiz app on that topic)",
      appId: "quiz",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "Topic/deck name to practice" },
        },
        required: ["topic"],
      },
      execute: async (params) => {
        const topic = String(params.topic ?? "").trim();
        if (!topic) return { success: false, error: "topic is required" };
        const slug = toTopicSlug(topic);
        const filePath = `${QUIZ_ROOT}/${slug}/${CARDS_FILENAME}`;
        try {
          await readFile(filePath);
        } catch {
          return { success: false, error: `Topic "${slug}" not found` };
        }
        return {
          success: true,
          data: { topic: slug, filePath, message: `Quiz session ready for ${slug}` },
        };
      },
    },
  ];
}
