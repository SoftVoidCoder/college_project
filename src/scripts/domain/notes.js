export function normalizeText(value) {
  return String(value ?? "").trim();
}

export function collectTags(text) {
  const matches = String(text).match(/#[\p{L}\p{N}_-]+/gu);
  return matches ? [...new Set(matches.map((tag) => tag.toLowerCase()))] : [];
}

export function createNote({ title, content, tags }) {
  const timestamp = new Date().toISOString();
  return {
    id: crypto.randomUUID?.() ?? `note-${Date.now()}`,
    title,
    content,
    tags,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function validateNote({ title, content }) {
  if (title.length < 3) return "Заголовок должен содержать минимум 3 символа.";
  if (!content) return "Добавьте текст заметки.";
  return "";
}

export function filterAndSortNotes(notes, { query, tag, sort }) {
  const normalizedQuery = normalizeText(query).toLowerCase();
  const filtered = notes.filter((note) => {
    const searchable = `${note.title} ${note.content} ${note.tags.join(" ")}`.toLowerCase();
    return (!normalizedQuery || searchable.includes(normalizedQuery)) && (!tag || note.tags.includes(tag));
  });

  return filtered.sort((first, second) => {
    if (sort === "title") return first.title.localeCompare(second.title, "ru");
    const direction = sort === "oldest" ? 1 : -1;
    return (new Date(first.createdAt) - new Date(second.createdAt)) * direction;
  });
}

export function getAllTags(notes) {
  return [...new Set(notes.flatMap((note) => note.tags))].sort((a, b) => a.localeCompare(b, "ru"));
}

export function formatNoteDate(note) {
  const date = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(note.updatedAt || note.createdAt));
  return note.updatedAt !== note.createdAt ? `${date} · изменено` : date;
}
