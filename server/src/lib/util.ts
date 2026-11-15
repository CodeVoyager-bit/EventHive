// A ref field may hold a raw ObjectId or a populated document; always return the id as a string.
export const idOf = (ref: unknown): string => {
  const id = (ref as { _id?: unknown } | null | undefined)?._id ?? ref;
  return id == null ? "" : String(id);
};

// Make user input safe to embed in a RegExp.
export const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
