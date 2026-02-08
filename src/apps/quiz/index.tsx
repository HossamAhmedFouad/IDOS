"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { AppProps } from "@/lib/types";
import {
  readFile,
  writeFile,
  listDirectory,
  createDirectory,
  deleteDirectory,
} from "@/lib/file-system";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { useToolRegistry } from "@/store/use-tool-registry";
import { createQuizTools } from "./tools";
import { Folder, FolderPlus, Trash2, ChevronRight, PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";

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

/** Slug for directory name: lowercase, no spaces, only safe chars. */
function toTopicSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    || "deck";
}

export function QuizApp({ id, config }: AppProps) {
  const updateAppConfig = useWorkspaceStore((s) => s.updateAppConfig);
  const registerTool = useToolRegistry((s) => s.registerTool);
  const quizTools = useMemo(() => createQuizTools(id), [id]);

  useEffect(() => {
    quizTools.forEach((tool) => registerTool(tool));
    // Do not unregister on unmount: agent may still have in-flight tool calls for this app.
  }, [quizTools, registerTool]);
  const rootPath = (config?.directoryPath as string | undefined) ?? QUIZ_ROOT;
  const savedFilePath = config?.filePath as string | undefined;
  const legacySinglePath = rootPath + "/" + CARDS_FILENAME;
  const selectedTopic =
    savedFilePath?.startsWith(rootPath + "/") &&
    savedFilePath !== legacySinglePath &&
    savedFilePath.endsWith("/" + CARDS_FILENAME)
      ? savedFilePath.slice(rootPath.length + 1, -(CARDS_FILENAME.length + 1))
      : null;

  const [topics, setTopics] = useState<string[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [activeTopic, setActiveTopic] = useState<string | null>(selectedTopic);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [cardsLoading, setCardsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const cardsPath = activeTopic ? `${rootPath}/${activeTopic}/${CARDS_FILENAME}` : null;

  const loadTopics = useCallback(async () => {
    setTopicsLoading(true);
    setTopicError(null);
    try {
      const names = await listDirectory(rootPath);
      const dirs = names.filter((n) => !n.includes("."));
      setTopics(dirs.sort((a, b) => a.localeCompare(b)));
    } catch {
      setTopics([]);
    } finally {
      setTopicsLoading(false);
    }
  }, [rootPath]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  useEffect(() => {
    setActiveTopic((prev) => (selectedTopic !== undefined ? selectedTopic : prev));
  }, [selectedTopic]);

  const loadCards = useCallback(async () => {
    if (!cardsPath) {
      setCards([]);
      setCardsLoading(false);
      return;
    }
    setCardsLoading(true);
    try {
      const text = await readFile(cardsPath);
      setCards(loadCardsFromJson(text));
      setCurrentIndex(0);
    } catch {
      setCards([]);
    } finally {
      setCardsLoading(false);
    }
  }, [cardsPath]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const saveCards = useCallback(
    async (newCards: Flashcard[]) => {
      if (!cardsPath) return;
      setSaving(true);
      try {
        await writeFile(cardsPath, JSON.stringify(newCards, null, 2));
      } finally {
        setSaving(false);
      }
    },
    [cardsPath]
  );

  const selectTopic = useCallback(
    (topic: string) => {
      setActiveTopic(topic);
      const path = `${rootPath}/${topic}/${CARDS_FILENAME}`;
      updateAppConfig(id, { filePath: path, directoryPath: rootPath });
    },
    [id, rootPath, updateAppConfig]
  );

  const createTopic = useCallback(async () => {
    const slug = toTopicSlug(newTopicName);
    if (!slug) return;
    setTopicError(null);
    try {
      await createDirectory(`${rootPath}/${slug}`);
      setTopics((t) => [...t, slug].sort((a, b) => a.localeCompare(b)));
      setNewTopicName("");
      setShowNewTopic(false);
      selectTopic(slug);
    } catch (err) {
      setTopicError(err instanceof Error ? err.message : "Could not create topic");
    }
  }, [newTopicName, rootPath, selectTopic]);

  const removeTopic = useCallback(
    async (topic: string) => {
      if (!confirm(`Delete topic "${topic}" and all its cards?`)) return;
      try {
        await deleteDirectory(`${rootPath}/${topic}`);
        setTopics((t) => t.filter((x) => x !== topic));
        if (activeTopic === topic) {
          setActiveTopic(null);
          updateAppConfig(id, { filePath: undefined, directoryPath: rootPath });
          setCards([]);
        }
      } catch {
        setTopicError("Could not delete topic");
      }
    },
    [rootPath, activeTopic, id, updateAppConfig]
  );

  const addCard = useCallback(() => {
    const f = front.trim();
    const b = back.trim();
    if (!f || !b || !cardsPath) return;
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
  }, [front, back, cards, cardsPath, saveCards]);

  const deleteCard = useCallback(
    (cardId: string) => {
      const newCards = cards.filter((c) => c.id !== cardId);
      setCards(newCards);
      saveCards(newCards);
      if (currentIndex >= newCards.length && newCards.length > 0) {
        setCurrentIndex(Math.max(0, newCards.length - 1));
      } else if (newCards.length === 0) {
        setCurrentIndex(0);
      }
      setFlipped(false);
    },
    [cards, currentIndex, saveCards]
  );

  const currentCard = cards[currentIndex];
  const topicsLoadingOrEmpty = topicsLoading || topics.length === 0;

  return (
    <div className="flex h-full">
      {/* Topic sidebar - collapsible */}
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r border-border bg-muted/30 transition-[width] duration-200 ease-in-out",
          sidebarOpen ? "w-44" : "w-10"
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center border-b border-border py-2",
            sidebarOpen ? "justify-between px-2" : "justify-center px-0"
          )}
        >
          {sidebarOpen ? (
            <span className="text-xs font-medium text-muted-foreground">Topics</span>
          ) : null}
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="size-4" />
            ) : (
              <PanelLeft className="size-4" />
            )}
          </button>
        </div>
        {sidebarOpen && (
          <>
            <div className="flex-1 overflow-y-auto p-1">
              {topicsLoading ? (
                <p className="px-2 py-2 text-xs text-muted-foreground">Loading…</p>
              ) : (
                topics.map((topic) => (
                  <div
                    key={topic}
                    className="group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm"
                  >
                    <button
                      type="button"
                      onClick={() => selectTopic(topic)}
                      className={cn(
                        "flex flex-1 items-center gap-1 truncate text-left",
                        activeTopic === topic
                          ? "font-medium text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <ChevronRight
                        className={cn("size-4 shrink-0", activeTopic === topic && "text-primary")}
                      />
                      <Folder className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{topic}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTopic(topic)}
                      className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      title="Delete topic"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-border p-1">
              {showNewTopic ? (
                <div className="flex flex-col gap-1 px-1 pb-1">
                  <input
                    type="text"
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    placeholder="Topic name"
                    className="rounded border border-border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") createTopic();
                      if (e.key === "Escape") setShowNewTopic(false);
                    }}
                  />
                  {topicError && (
                    <p className="text-xs text-destructive">{topicError}</p>
                  )}
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={createTopic}
                      className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewTopic(false);
                        setNewTopicName("");
                        setTopicError(null);
                      }}
                      className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNewTopic(true)}
                  className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <FolderPlus className="size-4 shrink-0" />
                  New topic
                </button>
              )}
            </div>
          </>
        )}
      </aside>

      {/* Cards area */}
      <main className="flex flex-1 flex-col overflow-hidden p-4">
        {!activeTopic ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-muted-foreground">
              {topicsLoadingOrEmpty
                ? "Create a topic to get started"
                : "Select a topic or create a new one"}
            </p>
            {!topicsLoadingOrEmpty && (
              <button
                type="button"
                onClick={() => setShowNewTopic(true)}
                className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                New topic
              </button>
            )}
          </div>
        ) : cardsLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <span className="text-sm text-muted-foreground">Loading cards…</span>
          </div>
        ) : (
          <>
            {saving && (
              <div className="mb-2 text-xs text-muted-foreground">Saving…</div>
            )}
            <div className="mb-2 text-xs font-medium text-foreground">{activeTopic}</div>
            {cards.length === 0 && !showForm ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4">
                <p className="text-sm text-muted-foreground">No cards in this topic yet</p>
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
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
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <input
                  type="text"
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  placeholder="Back (answer)"
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addCard}
                    className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
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
                    className="rounded border border-border px-4 py-2 text-sm hover:bg-muted"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {currentIndex + 1} / {cards.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    + Add card
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setFlipped(!flipped)}
                  className="flip-card-container flex flex-1 min-h-0 cursor-pointer"
                >
                  <div
                    key={currentIndex}
                    className="flip-card-inner"
                    data-flipped={flipped ? "true" : "false"}
                  >
                    <div className="flip-card-face flip-card-front absolute inset-0 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted p-6 text-center">
                      <p className="text-lg font-medium text-foreground">{currentCard.front}</p>
                      <span className="mt-2 text-xs text-muted-foreground">Click to flip</span>
                    </div>
                    <div className="flip-card-face flip-card-back absolute inset-0 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-primary/10 p-6 text-center">
                      <p className="text-lg font-medium text-foreground">{currentCard.back}</p>
                      <span className="mt-2 text-xs text-muted-foreground">Click to flip back</span>
                    </div>
                  </div>
                </button>
                <div className="mt-4 flex justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentIndex((i) => Math.max(0, i - 1));
                      setFlipped(false);
                    }}
                    disabled={currentIndex === 0}
                    className="rounded border border-border px-4 py-2 text-sm disabled:opacity-50 hover:bg-muted"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCard(currentCard.id)}
                    className="rounded px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
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
                    className="rounded border border-border px-4 py-2 text-sm disabled:opacity-50 hover:bg-muted"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
