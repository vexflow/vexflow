// In-memory object generations for uploader and cleanup tests. Keep the same compare-and-swap contract as GCS.
export function memoryStore(destination) {
  let state,
    generation = 0;
  const objects = new Map();
  return {
    destination,
    objects,
    read: () => ({
      state: structuredClone(state ?? { schema: 1, destination, releases: [] }),
      generation: String(generation),
    }),
    save(expected, next) {
      if (String(generation) !== expected) throw Error('Journal generation changed.');
      state = structuredClone(next);
      generation++;
    },
    bytes(path) {
      return objects.get(path)?.bytes ?? Buffer.alloc(0);
    },
    list(pattern = '') {
      return [...objects]
        .filter(([path]) => path.startsWith(pattern.split('*')[0]))
        .map(([path, { bytes, generation }]) => ({ path, size: bytes.length, generation }));
    },
    remove({ path, generation }) {
      if (objects.get(path)?.generation !== generation) throw Error('Object generation changed.');
      objects.delete(path);
    },
  };
}
