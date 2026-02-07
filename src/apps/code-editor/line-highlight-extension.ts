"use client";

import { StateEffect, StateField, StateEffectType, type Text, type Range } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";

export const setLineHighlightEffect: StateEffectType<{
  lineNumbers: number[];
  color: string;
}> = StateEffect.define();

export const clearLineHighlightEffect: StateEffectType<null> = StateEffect.define();

function buildDecorationSet(
  doc: Text,
  lineNumbers: number[],
  color: string
): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  for (const lineNum of lineNumbers) {
    if (lineNum < 1 || lineNum > doc.lines) continue;
    const line = doc.line(lineNum);
    ranges.push(
      Decoration.line({
        attributes: {
          style: `background-color: ${color}; transition: background-color 0.2s ease-out;`,
          "data-line": String(lineNum),
        },
      }).range(line.from)
    );
  }
  return Decoration.set(ranges, true);
}

export function lineHighlightField() {
  return StateField.define<DecorationSet>({
    create() {
      return Decoration.none;
    },
    update(value, tr) {
      let next = value.map(tr.changes);
      for (const effect of tr.effects) {
        if (effect.is(setLineHighlightEffect)) {
          const { lineNumbers, color } = effect.value;
          next = buildDecorationSet(tr.state.doc, lineNumbers, color);
        } else if (effect.is(clearLineHighlightEffect)) {
          next = Decoration.none;
        }
      }
      return next;
    },
    provide: (f) => EditorView.decorations.from(f),
  });
}

export function setLineHighlight(
  view: EditorView,
  lineNumbers: number[],
  color: string
): void {
  view.dispatch({
    effects: setLineHighlightEffect.of({ lineNumbers, color }),
  });
}

export function clearLineHighlight(view: EditorView): void {
  view.dispatch({ effects: clearLineHighlightEffect.of(null) });
}
