// Score-local IDs and notation provenance, independent of the ambient Registry.
import type { EasyScoreSourceSpan } from '../easyscore';
import type { Element } from '../element';
import { RuntimeError } from '../util';

/** Original notation input and its UTF-16, end-exclusive range. Measures are one-based. */
export interface EasyScoreSource extends EasyScoreSourceSpan {
  input: string;
  measure?: number;
}

/** Internal reference entry. The subscription is released by reset or failed construction. */
interface Reference {
  id: string;
  source?: EasyScoreSource;
  unsubscribe: () => void;
}

/** One index per EasyScore. Weak provenance also lets visual debuggers inspect an element directly. */
export class EasyScoreReferences {
  private static sources = new WeakMap<Element, EasyScoreSource>();
  private ids = new Map<string, Element>();
  private entries = new Map<Element, Reference>();
  private scopes: (() => void)[][] = [];

  /** Return a copy so tools cannot change the stored source range. */
  static sourceOf(element: Element): EasyScoreSource | undefined {
    const source = this.sources.get(element);
    return source && { ...source };
  }

  /** Missing IDs are ordinary lookup misses, including after reset. */
  get(id: string): Element | undefined {
    return this.ids.get(id);
  }

  /** Only members of this score have instance-local source metadata. */
  getSource(element: Element): EasyScoreSource | undefined {
    const source = this.entries.get(element)?.source;
    return source && { ...source };
  }

  /** Reject empty or duplicate IDs before registration or native ID mutation. */
  private validate(element: Element, id: string | undefined): asserts id is string {
    if (!id) throw new RuntimeError('BadArguments', 'Score elements need a nonempty ID.');
    const existing = this.ids.get(id);
    if (existing && existing !== element) throw new RuntimeError('BadArguments', `Duplicate score element ID: ${id}`);
  }

  /** Repeated registration is harmless. Native ID changes keep the index synchronized. */
  add<T extends Element>(element: T, source?: EasyScoreSource): T {
    const previous = this.entries.get(element);
    if (previous) return element;
    const id = element.getAttribute('id');
    this.validate(element, id);
    const entry: Reference = {
      id,
      source: source && { ...source },
      unsubscribe: element.onIdChange(
        (next) => this.validate(element, next),
        () => {
          this.ids.delete(entry.id);
          entry.id = element.getAttribute('id');
          this.ids.set(entry.id, element);
        }
      ),
    };
    this.entries.set(element, entry);
    this.ids.set(id, element);
    if (entry.source) EasyScoreReferences.sources.set(element, entry.source);
    this.scopes[this.scopes.length - 1]?.push(() => this.remove(element));
    return element;
  }

  /** Release exactly this score's subscription and provenance. */
  private remove(element: Element): void {
    const entry = this.entries.get(element);
    if (!entry) return;
    entry.unsubscribe();
    this.ids.delete(entry.id);
    this.entries.delete(element);
    if (entry.source === EasyScoreReferences.sources.get(element)) EasyScoreReferences.sources.delete(element);
  }

  /** Preserve references across draw(); reset explicitly ends the editing session. */
  clear(): void {
    for (const element of this.entries.keys()) this.remove(element);
  }

  /** Nested failed construction releases subscriptions as well as visible references. */
  transaction<T>(build: () => T): T {
    const undo: (() => void)[] = [];
    this.scopes.push(undo);
    try {
      const result = build();
      this.scopes.pop();
      this.scopes[this.scopes.length - 1]?.push(...undo);
      return result;
    } catch (error) {
      this.scopes.pop();
      undo.reverse().forEach((revert) => revert());
      throw error;
    }
  }
}
