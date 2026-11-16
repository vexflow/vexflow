// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License
// @author Mohit Cheppudira
//
// ## Description
//
// This file implements a registry for VexFlow elements. It allows users
// to track, query, and manage some subset of generated elements, and
// dynamically get and set attributes.
//
// There are two ways to register with a registry:
//
// 1) Explicitly call `registry.register(elem:Element, id?:string)`, or,
// 2) Call `Registry.enableDefaultRegistry(registry)` when ready, and all future
//    elements will automatically register with it.
//
// Once an element is registered, selected attributes are tracked and indexed by
// the registry. This allows fast look up of elements by attributes like id, type,
// and class.

import { Element } from './element';
import { RuntimeError } from './util';

// Indexes are represented as maps of maps of maps. This allows
// for both multi-labeling (e.g., an element can have multiple classes)
// and efficient lookup.
class Index {
  // [attributeName][attributeValue][elementId] => Element
  [key: string]: { [key: string]: { [key: string]: Element } };
  constructor() {
    this.id = Object.create(null);
    this.type = Object.create(null);
    this.class = Object.create(null);
  }

  /** Only these attributes may select an index, even when called directly. */
  static isValidName(name: string): boolean {
    return name === 'id' || name === 'type' || name === 'class';
  }
}

export interface RegistryUpdate {
  id: string;
  name: string;
  value: string | undefined;
  oldValue: string | undefined;
}

export class Registry {
  protected static defaultRegistry?: Registry;

  static getDefaultRegistry(): Registry | undefined {
    return Registry.defaultRegistry;
  }

  // If you call `enableDefaultRegistry`, any new elements will auto-register with
  // the provided registry as soon as they're constructed.
  static enableDefaultRegistry(registry: Registry): void {
    Registry.defaultRegistry = registry;
  }

  static disableDefaultRegistry(): void {
    Registry.defaultRegistry = undefined;
  }

  protected index: Index;
  /** Registrations made during nested synchronous construction scopes. */
  private transactions: Set<Element>[] = [];

  /** Restore indexes and detach new elements if construction fails. External mutations are not undone. */
  transaction<T>(build: () => T): T {
    const before = new Index();
    for (const name of Object.keys(this.index)) {
      for (const [value, elements] of Object.entries(this.index[name])) {
        before[name][value] = Object.assign(Object.create(null), elements);
      }
    }
    const existing = new Set(Object.values(before.id).flatMap((elements) => Object.values(elements)));
    const created = new Set<Element>();
    this.transactions.push(created);
    try {
      return build();
    } catch (error) {
      created.forEach((element) => {
        if (!existing.has(element)) element.onRegister(undefined);
      });
      this.index = before;
      throw error;
    } finally {
      this.transactions.pop();
    }
  }

  constructor() {
    this.index = new Index();
  }

  clear(): this {
    this.index = new Index();
    return this;
  }

  setIndexValue(name: string, value: string, id: string, elem: Element): void {
    if (!Index.isValidName(name)) {
      throw new RuntimeError('BadArgument', `Unknown registry index: ${name}`);
    }
    const index = this.index;
    if (!index[name][value]) {
      // IDs and values such as __proto__ are ordinary keys, never inherited properties.
      index[name][value] = Object.create(null);
    }
    index[name][value][id] = elem;
  }

  // Updates the indexes for element 'id'. If an element's attribute changes
  // from A -> B, make sure to remove the element from A.
  updateIndex({ id, name, value, oldValue }: RegistryUpdate): void {
    if (!Index.isValidName(name)) {
      throw new RuntimeError('BadArgument', `Unknown registry index: ${name}`);
    }
    const elem = this.getElementById(id);
    if (oldValue !== undefined && this.index[name][oldValue]) {
      delete this.index[name][oldValue][id];
    }
    if (value && elem) {
      this.setIndexValue(name, value, elem.getAttribute('id'), elem);
    }
  }

  /**
   * Register element `elem` with this registry.
   * This adds the element to its index and watches it for attribute changes.
   * @param elem
   * @param id
   * @returns this
   */
  register(elem: Element, id?: string): this {
    id = id || elem.getAttribute('id');
    if (!id) {
      throw new RuntimeError("Can't add element without `id` attribute to registry");
    }

    this.transactions.forEach((transaction) => transaction.add(elem));

    // Manually add id to index, then update other indexes.
    elem.setAttribute('id', id);
    this.setIndexValue('id', id, id, elem);
    this.updateIndex({ id, name: 'type', value: elem.getAttribute('type'), oldValue: undefined });
    elem.onRegister(this);
    return this;
  }

  getElementById(id: string): Element | undefined {
    return this.index.id?.[id]?.[id]; // return undefined if the id is not found.
  }

  getElementsByAttribute(attribute: string, value: string): Element[] {
    if (!Index.isValidName(attribute)) return [];
    const indexAttr = this.index[attribute];
    if (indexAttr) {
      const indexAttrVal = indexAttr[value];
      if (indexAttrVal) {
        const keys = Object.keys(indexAttrVal);
        return keys.map((k) => indexAttrVal[k]);
      }
    }
    return [];
  }

  getElementsByType(type: string): Element[] {
    return this.getElementsByAttribute('type', type);
  }

  getElementsByClass(className: string): Element[] {
    return this.getElementsByAttribute('class', className);
  }

  // This is called by the element when an attribute value changes. If an indexed
  // attribute changes, then update the local index.
  onUpdate(info: RegistryUpdate): this {
    if (Index.isValidName(info.name)) {
      this.updateIndex(info);
    }
    return this;
  }
}
