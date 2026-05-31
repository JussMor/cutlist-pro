/**
 * lib/studio/aggregate.ts
 * Combine several Studio documents (e.g. a dresser + a nightstand) into a single
 * despiece so the optimizer can nest them together and produce one final cost.
 *
 * Option B in the project plan: each piece of furniture stays its own document.
 * Here we run computeDespiece() per document, multiply every panel by the
 * requested unit quantity, and concatenate the results into one flat panel list.
 * The optimizer is document-agnostic — it just needs that merged list.
 *
 * Panel keys/badges are namespaced per source document so identical pieces from
 * different furniture never collide and stay traceable back to their origin.
 */
import { computeDespiece, type DespieceResult, type StudioPanel } from "./despiece";
import type { StudioDocument } from "./document";

/** One furniture document included in a combined optimization run. */
export interface AggregateEntry {
  doc: StudioDocument;
  /** How many identical units of this furniture to build (>= 1). */
  quantity: number;
}

/** A panel in a combined run, tagged with where it came from. */
export interface AggregatedPanel extends StudioPanel {
  /** Source document id this panel was generated from. */
  sourceDocId: string;
  /** Human label of the source document (for the despiece table / export). */
  sourceTitle: string;
}

export interface AggregateResult {
  panels: AggregatedPanel[];
  operations: DespieceResult["operations"];
  /** Per-document summary, handy for a breakdown UI. */
  sources: { id: string; title: string; quantity: number; panelCount: number }[];
}

const safeQty = (q: number): number =>
  Number.isFinite(q) && q > 0 ? Math.floor(q) : 1;

/**
 * Build a combined despiece from multiple documents.
 *
 * - Each document's panels are computed independently, then their qty is
 *   multiplied by the document's unit quantity.
 * - Keys/badges are prefixed with the source doc id so they're unique and
 *   identifiable across the whole run.
 * - Machining operations are concatenated (qty already scaled via panels).
 */
export function aggregateDespiece(entries: AggregateEntry[]): AggregateResult {
  const panels: AggregatedPanel[] = [];
  const operations: DespieceResult["operations"] = [];
  const sources: AggregateResult["sources"] = [];

  for (const { doc, quantity } of entries) {
    const units = safeQty(quantity);
    const { panels: docPanels, operations: docOps } = computeDespiece(doc);

    for (const p of docPanels) {
      panels.push({
        ...p,
        key: `${doc.id}/${p.key}`,
        // Tag the badge with a short doc prefix so the cutlist stays readable
        // when pieces from several furniture share the table.
        badge: `${shortTag(doc, sources.length)}·${p.badge}`,
        qty: p.qty * units,
        sourceDocId: doc.id,
        sourceTitle: doc.title,
      });
    }

    // Operation quantities scale with the unit count too (one bore per door,
    // N doors per unit, M units).
    for (const op of docOps) {
      operations.push({ ...op, qty: op.qty * units });
    }

    sources.push({
      id: doc.id,
      title: doc.title,
      quantity: units,
      panelCount: docPanels.length,
    });
  }

  return { panels, operations, sources };
}

/** Stable, short, 1-based tag for a document within the run (A, B, C, …). */
function shortTag(doc: StudioDocument, index: number): string {
  // Letters keep the cutlist compact; fall back to the index past 26 docs.
  if (index < 26) return String.fromCharCode(65 + index);
  return `D${index + 1}`;
}
