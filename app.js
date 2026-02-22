'use strict';

const STORAGE_KEY   = 'todos';
const FOLDERS_KEY   = 'folders';
const FOLDER_COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444'];

let todos   = load();
let folders = loadFolders();
let currentFilter       = 'all';
let currentFolderFilter = null;

const form            = document.getElementById('todo-form');
const input           = document.getElementById('todo-input');
const dueDateEl       = document.getElementById('due-date');
const dueTimeEl       = document.getElementById('due-time');
const list            = document.getElementById('todo-list');
const countEl         = document.getElementById('count');
const footer          = document.getElementById('footer');
const clearBtn        = document.getElementById('clear-done');
const filterBtns      = document.querySelectorAll('.filter-btn');
const folderFiltersEl = document.getElementById('folder-filters');
const todoFolderSel   = document.getElementById('todo-folder');
const newFolderRow    = document.getElementById('new-folder-row');
const newFolderInput  = document.getElementById('new-folder-input');
const newFolderBtn    = document.getElementById('new-folder-btn');

// ── Events ────────────────────────────────────────────────────────────────────

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  const dateVal = dueDateEl.value;
  const timeVal = dueTimeEl.value;
  let due = null;
  if (dateVal) {
    due = timeVal ? `${dateVal}T${timeVal}` : `${dateVal}T23:59`;
  }

  const rawFolder = todoFolderSel.value;
  const folderId  = rawFolder && rawFolder !== '__new__' ? Number(rawFolder) : null;

  todos.push({ id: Date.now(), text, done: false, due, folderId });
  input.value      = '';
  dueDateEl.value  = '';
  dueTimeEl.value  = '';
  todoFolderSel.value = '';
  newFolderRow.classList.add('hidden');
  input.focus();
  save();
  render();
});

clearBtn.addEventListener('click', () => {
  todos = todos.filter((t) => !t.done);
  save();
  render();
});

filterBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    filterBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
});

todoFolderSel.addEventListener('change', () => {
  if (todoFolderSel.value === '__new__') {
    newFolderRow.classList.remove('hidden');
    newFolderInput.focus();
  } else {
    newFolderRow.classList.add('hidden');
  }
});

function confirmNewFolder() {
  const name = newFolderInput.value.trim();
  if (!name) { newFolderInput.focus(); return; }
  const folder = { id: Date.now(), name };
  folders.push(folder);
  saveFolders();
  newFolderInput.value = '';
  newFolderRow.classList.add('hidden');
  populateFolderSelect(todoFolderSel, folder.id);
  renderFolderFilters();
}

newFolderBtn.addEventListener('click', confirmNewFolder);
newFolderInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter')  { e.preventDefault(); confirmNewFolder(); }
  if (e.key === 'Escape') { newFolderRow.classList.add('hidden'); todoFolderSel.value = ''; }
});

// ── Folder helpers ─────────────────────────────────────────────────────────────

function folderColor(folder) {
  const i = folders.indexOf(folder);
  return FOLDER_COLORS[i % FOLDER_COLORS.length];
}

function populateFolderSelect(selectEl, selectedId = null, includeNew = true) {
  const prev = selectEl.value;
  selectEl.innerHTML = '';

  const noneOpt = document.createElement('option');
  noneOpt.value = '';
  noneOpt.textContent = 'Kein Ordner';
  selectEl.appendChild(noneOpt);

  folders.forEach((f) => {
    const opt = document.createElement('option');
    opt.value = String(f.id);
    opt.textContent = f.name;
    selectEl.appendChild(opt);
  });

  if (includeNew) {
    const newOpt = document.createElement('option');
    newOpt.value = '__new__';
    newOpt.textContent = '+ Neuer Ordner';
    selectEl.appendChild(newOpt);
  }

  if (selectedId !== null) {
    selectEl.value = String(selectedId);
  } else if (prev && prev !== '__new__') {
    selectEl.value = prev;
  }
}

function renderFolderFilters() {
  populateFolderSelect(todoFolderSel);
  if (todoFolderSel.value === '') {
    newFolderRow.classList.add('hidden');
  }

  folderFiltersEl.innerHTML = '';
  if (folders.length === 0) return;

  const allBtn = document.createElement('button');
  allBtn.className = 'folder-filter-btn' + (currentFolderFilter === null ? ' active' : '');
  allBtn.textContent = 'Alle Ordner';
  allBtn.addEventListener('click', () => { currentFolderFilter = null; render(); });
  folderFiltersEl.appendChild(allBtn);

  folders.forEach((f) => {
    const color = folderColor(f);
    const btn = document.createElement('button');
    btn.className = 'folder-filter-btn' + (currentFolderFilter === f.id ? ' active' : '');
    btn.style.setProperty('--fc', color);
    btn.addEventListener('click', () => { currentFolderFilter = f.id; render(); });

    const nameSpan = document.createElement('span');
    nameSpan.textContent = f.name;

    const delSpan = document.createElement('span');
    delSpan.className = 'folder-del-btn';
    delSpan.textContent = '×';
    delSpan.title = 'Ordner löschen';
    delSpan.addEventListener('click', (e) => { e.stopPropagation(); removeFolder(f.id); });

    btn.append(nameSpan, delSpan);
    folderFiltersEl.appendChild(btn);
  });
}

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
  renderFolderFilters();

  const visible = todos.filter((t) => {
    if (currentFilter === 'active' && t.done)  return false;
    if (currentFilter === 'done'   && !t.done) return false;
    if (currentFolderFilter !== null && t.folderId !== currentFolderFilter) return false;
    return true;
  });

  list.innerHTML = '';

  if (visible.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty-state';
    li.textContent = currentFilter === 'done'
      ? 'Noch nichts erledigt.'
      : 'Keine Aufgaben. Super!';
    list.appendChild(li);
  } else {
    visible.forEach((todo) => list.appendChild(createItem(todo)));
  }

  const openCount = todos.filter((t) => !t.done).length;
  const doneCount = todos.filter((t) => t.done).length;

  countEl.textContent = `${openCount} offen`;
  footer.classList.toggle('hidden', todos.length === 0);
  clearBtn.style.visibility = doneCount > 0 ? 'visible' : 'hidden';
}

function formatDue(isoString) {
  const date = new Date(isoString);
  const hasTime = !isoString.endsWith('T23:59');

  const dateStr = date.toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  if (!hasTime) return dateStr;

  const timeStr = date.toLocaleTimeString('de-DE', {
    hour: '2-digit', minute: '2-digit',
  });
  return `${dateStr}, ${timeStr} Uhr`;
}

function isOverdue(isoString, done) {
  if (done) return false;
  return new Date(isoString) < new Date();
}

function createItem(todo) {
  const li = document.createElement('li');
  if (todo.done) li.classList.add('done');

  const overdue = todo.due && isOverdue(todo.due, todo.done);
  if (overdue) li.classList.add('overdue');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'todo-check';
  checkbox.checked = todo.done;
  checkbox.setAttribute('aria-label', `Erledigt: ${todo.text}`);
  checkbox.addEventListener('change', () => toggle(todo.id));

  const content = document.createElement('div');
  content.className = 'todo-content';

  const label = document.createElement('span');
  label.className = 'todo-label';
  label.textContent = todo.text;
  label.addEventListener('click', () => toggle(todo.id));
  content.appendChild(label);

  if (todo.folderId) {
    const folder = folders.find(f => f.id === todo.folderId);
    if (folder) {
      const color = folderColor(folder);
      const badge = document.createElement('span');
      badge.className = 'folder-badge';
      badge.textContent = folder.name;
      badge.style.color = color;
      badge.style.background = color + '18';
      badge.style.borderColor = color + '40';
      content.appendChild(badge);
    }
  }

  if (todo.due) {
    const dueSpan = document.createElement('span');
    dueSpan.className = 'todo-due' + (overdue ? ' todo-due--overdue' : '');
    dueSpan.textContent = (overdue ? '⚠ Überfällig · ' : '📅 ') + formatDue(todo.due);
    content.appendChild(dueSpan);
  }

  const editBtn = document.createElement('button');
  editBtn.className = 'edit-btn';
  editBtn.textContent = '✎';
  editBtn.setAttribute('aria-label', 'Bearbeiten');
  editBtn.addEventListener('click', () => startEdit(li, todo));

  const del = document.createElement('button');
  del.className = 'delete-btn';
  del.textContent = '✕';
  del.setAttribute('aria-label', 'Löschen');
  del.addEventListener('click', () => remove(todo.id));

  li.append(checkbox, content, editBtn, del);
  return li;
}

function startEdit(li, todo) {
  const content     = li.querySelector('.todo-content');
  const label       = content.querySelector('.todo-label');
  const folderBadge = content.querySelector('.folder-badge');
  const dueSpan     = content.querySelector('.todo-due');

  // Text → Input
  const textInput = document.createElement('input');
  textInput.type = 'text';
  textInput.className = 'edit-input';
  textInput.value = todo.text;
  textInput.maxLength = 200;
  label.replaceWith(textInput);

  // Remove folder badge (replaced by select below)
  if (folderBadge) folderBadge.remove();

  // Folder select
  const editFolderSelect = document.createElement('select');
  editFolderSelect.className = 'edit-folder-select';
  populateFolderSelect(editFolderSelect, todo.folderId, false);
  content.appendChild(editFolderSelect);

  // Due date → editable fields
  const dueRow = document.createElement('div');
  dueRow.className = 'edit-due-row';

  const editDateInput = document.createElement('input');
  editDateInput.type = 'date';
  editDateInput.className = 'edit-date';

  const editTimeInput = document.createElement('input');
  editTimeInput.type = 'time';
  editTimeInput.className = 'edit-time';

  if (todo.due) {
    editDateInput.value = todo.due.substring(0, 10);
    const t = todo.due.substring(11, 16);
    if (t !== '23:59') editTimeInput.value = t;
  }

  dueRow.append(editDateInput, editTimeInput);
  if (dueSpan) dueSpan.replaceWith(dueRow);
  else content.appendChild(dueRow);

  // Swap action buttons
  const editBtnEl = li.querySelector('.edit-btn');
  const delBtnEl  = li.querySelector('.delete-btn');
  editBtnEl.style.display = 'none';
  delBtnEl.style.display  = 'none';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'save-btn';
  saveBtn.textContent = '✓';
  saveBtn.setAttribute('aria-label', 'Speichern');

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'cancel-btn';
  cancelBtn.textContent = '✕';
  cancelBtn.setAttribute('aria-label', 'Abbrechen');

  li.insertBefore(saveBtn, delBtnEl);
  li.insertBefore(cancelBtn, delBtnEl);

  textInput.focus();
  textInput.select();

  function commit() {
    const newText = textInput.value.trim();
    if (!newText) { textInput.focus(); return; }
    const dateVal = editDateInput.value;
    const timeVal = editTimeInput.value;
    const newDue = dateVal
      ? (timeVal ? `${dateVal}T${timeVal}` : `${dateVal}T23:59`)
      : null;
    const rawFolder  = editFolderSelect.value;
    const newFolderId = rawFolder ? Number(rawFolder) : null;
    updateTodo(todo.id, newText, newDue, newFolderId);
  }

  saveBtn.addEventListener('click', commit);
  cancelBtn.addEventListener('click', render);
  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  commit();
    if (e.key === 'Escape') render();
  });
}

// ── Actions ───────────────────────────────────────────────────────────────────

function toggle(id) {
  todos = todos.map((t) => t.id === id ? { ...t, done: !t.done } : t);
  save();
  render();
}

function remove(id) {
  todos = todos.filter((t) => t.id !== id);
  save();
  render();
}

function updateTodo(id, text, due, folderId) {
  todos = todos.map((t) => t.id === id ? { ...t, text, due, folderId } : t);
  save();
  render();
}

function removeFolder(id) {
  folders = folders.filter(f => f.id !== id);
  todos   = todos.map(t => t.folderId === id ? { ...t, folderId: null } : t);
  if (currentFolderFilter === id) currentFolderFilter = null;
  saveFolders();
  save();
  render();
}

// ── Persistence ───────────────────────────────────────────────────────────────

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveFolders() {
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
}

function loadFolders() {
  try {
    return JSON.parse(localStorage.getItem(FOLDERS_KEY)) || [];
  } catch {
    return [];
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

render();
