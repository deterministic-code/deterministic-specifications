/** Host-supplied access to the deterministic YAML tree (disk, memory, zip, …). */
export type IDeterministicReader = {
  read: (name: string) => Promise<string>;
  exists: (name: string) => Promise<boolean>;
};

export const memoryReader = (
  files: Record<string, string>,
): IDeterministicReader => ({
  read: async (name) => {
    if (!(name in files)) {
      throw new Error(`deterministic reader: missing ${name}`);
    }
    return files[name]!;
  },
  exists: async (name) => name in files,
});
