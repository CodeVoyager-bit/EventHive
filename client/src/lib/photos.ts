// Unsplash photos (Unsplash License: free to use, hotlinking encouraged). IDs were checked to exist.
export const photo = (id: string, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const PHOTOS = {
  login: photo("1533174072545-7a4b6ad7a6c3", 1400),
  register: photo("1501281668745-f7f57925c3b4", 1400),
};
