import { MESSAGE_TIMEOUT } from "./config.js";
import { loadNotes, saveNotes } from "./services/storage.js";
import {
  collectTags,
  createNote,
  filterAndSortNotes,
  formatNoteDate,
  getAllTags,
  normalizeText,
  validateNote,
} from "./domain/notes.js";

const $ = (id) => document.getElementById(id);
const ui = {
  form: $("noteForm"), title: $("titleInput"), content: $("contentInput"), tags: $("tagsInput"),
  formTitle: $("formTitle"), submit: $("submitBtn"), cancel: $("cancelEditBtn"),
  search: $("searchInput"), sort: $("sortSelect"), tagCloud: $("tagsCloud"),
  resetTag: $("resetTagFilterBtn"), clearAll: $("clearAllBtn"), list: $("notesList"),
  template: $("noteTemplate"), message: $("messageBox"), activeFilter: $("activeFilter"),
  notesCount: $("notesCount"), tagsCount: $("tagsCount"), visibleCount: $("visibleCount"),
};

const state = { notes: loadNotes(), editingId: null, activeTag: "", internalReset: false };

ui.form.addEventListener("submit", handleSubmit);
ui.form.addEventListener("reset", handleReset);
ui.cancel.addEventListener("click", resetEditor);
ui.search.addEventListener("input", render);
ui.sort.addEventListener("change", render);
ui.resetTag.addEventListener("click", () => setTagFilter(""));
ui.clearAll.addEventListener("click", clearAllNotes);
render();

function handleSubmit(event) {
  event.preventDefault();
  const title = normalizeText(ui.title.value);
  const content = normalizeText(ui.content.value);
  const tags = [...new Set([...collectTags(ui.tags.value), ...collectTags(content)])];
  const error = validateNote({ title, content });
  if (error) return showMessage(error, "error");

  if (state.editingId) {
    state.notes = state.notes.map((note) => note.id === state.editingId
      ? { ...note, title, content, tags, updatedAt: new Date().toISOString() }
      : note);
    showMessage("Изменения сохранены.");
  } else {
    state.notes.unshift(createNote({ title, content, tags }));
    showMessage("Заметка сохранена.");
  }
  persist();
  resetEditor();
  render();
  document.querySelector("#notes").scrollIntoView({ behavior: "smooth" });
}

function handleReset() {
  if (state.internalReset) return void (state.internalReset = false);
  if (state.editingId) window.setTimeout(resetEditor, 0);
}

function render() {
  const visible = filterAndSortNotes(state.notes, {
    query: ui.search.value,
    tag: state.activeTag,
    sort: ui.sort.value,
  });
  renderTags();
  renderNotes(visible);
  ui.notesCount.textContent = state.notes.length;
  ui.tagsCount.textContent = getAllTags(state.notes).length;
  ui.visibleCount.textContent = visible.length;
  ui.clearAll.disabled = state.notes.length === 0;
}

function renderTags() {
  const tags = getAllTags(state.notes);
  ui.tagCloud.replaceChildren();
  ui.resetTag.classList.toggle("hidden", !state.activeTag);
  ui.activeFilter.classList.toggle("hidden", !state.activeTag);
  ui.activeFilter.textContent = state.activeTag ? `Фильтр: ${state.activeTag}` : "";

  if (!tags.length) {
    const text = document.createElement("p");
    text.className = "sidebar-empty";
    text.textContent = "Здесь появятся ваши теги";
    ui.tagCloud.append(text);
    return;
  }
  tags.forEach((tag) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tag-chip${state.activeTag === tag ? " active" : ""}`;
    button.textContent = tag;
    button.addEventListener("click", () => setTagFilter(state.activeTag === tag ? "" : tag));
    ui.tagCloud.append(button);
  });
}

function renderNotes(notes) {
  ui.list.replaceChildren();
  if (!notes.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `<span>✦</span><h3>${state.notes.length ? "Ничего не найдено" : "Первая заметка начинается здесь"}</h3><p>${state.notes.length ? "Попробуйте изменить запрос или снять фильтр." : "Сохраните идею, задачу или важную мысль."}</p>`;
    ui.list.append(empty);
    return;
  }
  notes.forEach((note, index) => {
    const fragment = ui.template.content.cloneNode(true);
    const card = fragment.querySelector(".note-card");
    card.style.setProperty("--card-index", index);
    fragment.querySelector(".note-title").textContent = note.title;
    fragment.querySelector(".note-content").textContent = note.content;
    fragment.querySelector(".note-date").textContent = formatNoteDate(note);
    const tagList = fragment.querySelector(".note-tags");
    note.tags.forEach((tag) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "note-tag";
      chip.textContent = tag;
      chip.addEventListener("click", () => setTagFilter(tag));
      tagList.append(chip);
    });
    fragment.querySelector(".edit-btn").addEventListener("click", () => startEdit(note.id));
    fragment.querySelector(".delete-btn").addEventListener("click", () => removeNote(note.id));
    ui.list.append(fragment);
  });
}

function startEdit(id) {
  const note = state.notes.find((item) => item.id === id);
  if (!note) return;
  state.editingId = id;
  ui.title.value = note.title;
  ui.content.value = note.content;
  ui.tags.value = note.tags.join(" ");
  ui.formTitle.textContent = "Редактирование";
  ui.submit.textContent = "Сохранить изменения";
  ui.cancel.classList.remove("hidden");
  document.querySelector("#editor").scrollIntoView({ behavior: "smooth" });
  ui.title.focus({ preventScroll: true });
}

function resetEditor() {
  state.editingId = null;
  state.internalReset = true;
  ui.form.reset();
  ui.formTitle.textContent = "Новая заметка";
  ui.submit.textContent = "Сохранить заметку";
  ui.cancel.classList.add("hidden");
}

function removeNote(id) {
  const note = state.notes.find((item) => item.id === id);
  if (!note || !window.confirm(`Удалить «${note.title}»?`)) return;
  state.notes = state.notes.filter((item) => item.id !== id);
  if (state.editingId === id) resetEditor();
  persist();
  render();
  showMessage("Заметка удалена.");
}

function clearAllNotes() {
  if (!state.notes.length || !window.confirm("Удалить все заметки без возможности восстановления?")) return;
  state.notes = [];
  state.activeTag = "";
  resetEditor();
  persist();
  render();
  showMessage("Список очищен.");
}

function setTagFilter(tag) {
  state.activeTag = tag;
  render();
}

function persist() {
  saveNotes(state.notes);
}

function showMessage(text, type = "success") {
  ui.message.textContent = text;
  ui.message.dataset.type = type;
  ui.message.classList.remove("hidden");
  clearTimeout(showMessage.timer);
  showMessage.timer = window.setTimeout(() => ui.message.classList.add("hidden"), MESSAGE_TIMEOUT);
}
