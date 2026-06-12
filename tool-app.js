/* ─────────────────────────────────────
   Util
───────────────────────────────────── */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

/* ─────────────────────────────────────
   State
───────────────────────────────────── */
let images      = [];
let selectedIds = new Set();
let dragSrcIds  = [];
let draggedEl   = null;

let history      = [];
let historyIdx   = -1;
const HISTORY_MAX = 20;

const MAX_PER_BATCH       = 500;
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

/* ─────────────────────────────────────
   DOM refs
───────────────────────────────────── */
const fileInput   = document.getElementById('fileInput');
const galleryGrid = document.getElementById('galleryGrid');
const galleryWrap = document.getElementById('galleryWrap');
const dropZone    = document.getElementById('dropZone');
const mainArea    = document.getElementById('mainArea');
const sizeSlider  = document.getElementById('sizeSlider');
const sizeVal     = document.getElementById('sizeVal');
const saveBtn     = document.getElementById('saveBtn');
const deleteBtn   = document.getElementById('deleteBtn');
const resetBtn    = document.getElementById('resetBtn');
const undoBtn     = document.getElementById('undoBtn');
const redoBtn     = document.getElementById('redoBtn');
const fileBadge   = document.getElementById('fileBadge');
const selBadge    = document.getElementById('selBadge');
const batchBadge  = document.getElementById('batchBadge');
const progressWrap= document.getElementById('progressWrap');
const progFill    = document.getElementById('progFill');
const progText    = document.getElementById('progText');
const kbHint      = document.getElementById('kbHint');
const toastBox    = document.getElementById('toastBox');

// ログアウトボタン（onclick属性の代わりにイベントリスナーで登録）
document.getElementById('logoutBtn').addEventListener('click', () => window.signOutEverywhere());

// img読み込みエラー処理（onerror属性の代わりにキャプチャリスナーで対応）
galleryGrid.addEventListener('error', e => {
  if (e.target.classList.contains('img-preview')) e.target.style.display = 'none';
}, true);

/* ─────────────────────────────────────
   Toast
───────────────────────────────────── */
function toast(message, type = 'info', ms = 3000) {
  const icons = { ok:'✅', error:'❌', info:'ℹ️', warn:'⚠️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  toastBox.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .25s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 280);
  }, ms);
}

/* ─────────────────────────────────────
   D-1: Undo / Redo
───────────────────────────────────── */
function saveHistory() {
  history.length = historyIdx + 1;
  history.push([...images]);
  if (history.length > HISTORY_MAX + 1) history.shift();
  historyIdx = history.length - 1;
  refreshUndoRedo();
}

function undo() {
  if (historyIdx <= 0) return;
  historyIdx--;
  images = [...history[historyIdx]];
  selectedIds.clear();
  renderAll();
  toast('元に戻しました', 'info', 1500);
}

function redo() {
  if (historyIdx >= history.length - 1) return;
  historyIdx++;
  images = [...history[historyIdx]];
  selectedIds.clear();
  renderAll();
  toast('やり直しました', 'info', 1500);
}

function refreshUndoRedo() {
  undoBtn.disabled = historyIdx <= 0;
  redoBtn.disabled = historyIdx >= history.length - 1;
}

undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);

/* ─────────────────────────────────────
   ファイル処理
───────────────────────────────────── */
fileInput.addEventListener('change', e => {
  processFiles(Array.from(e.target.files));
  fileInput.value = '';
});

function processFiles(newFiles) {
  if (!newFiles.length) return;
  const existKeys = new Set(images.map(i => `${i.name}_${i.size}`));

  const oversized = newFiles.filter(f => f.size > MAX_FILE_SIZE_BYTES);
  if (oversized.length) toast(`${oversized.length}個のファイルが100MBを超えるため除外しました`, 'warn');

  const valid = newFiles.filter(f =>
    f && f.name && f.size && f.size <= MAX_FILE_SIZE_BYTES && !existKeys.has(`${f.name}_${f.size}`)
  );
  const dupes = newFiles.filter(f =>
    f && f.name && f.size && f.size <= MAX_FILE_SIZE_BYTES && existKeys.has(`${f.name}_${f.size}`)
  );

  const added = valid.map((file, i) => ({
    file, name: file.name,
    url: URL.createObjectURL(file),
    id:  `img-${Date.now()}-${images.length + i}`,
    size: file.size, type: file.type
  }));

  images.push(...added);
  if (added.length) toast(`${added.length}枚の画像を追加しました`, 'ok');
  if (dupes.length) toast(`${dupes.length}個の重複をスキップ`, 'warn', 2000);

  saveHistory();
  selectedIds.clear();
  renderAll();
}

/* ─────────────────────────────────────
   B-3: OSからのファイルドロップ
───────────────────────────────────── */
function bindFileDrop(el) {
  el.addEventListener('dragover', e => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    el.classList.add('drag-active');
  });
  el.addEventListener('dragleave', e => {
    if (!el.contains(e.relatedTarget)) el.classList.remove('drag-active');
  });
  el.addEventListener('drop', e => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    el.classList.remove('drag-active');
    processFiles(Array.from(e.dataTransfer.files));
  });
}
bindFileDrop(dropZone);

mainArea.addEventListener('dragover', e => {
  if (!e.dataTransfer.types.includes('Files') || !images.length) return;
  e.preventDefault();
  galleryWrap.classList.add('file-drag-active');
});
mainArea.addEventListener('dragleave', e => {
  if (!mainArea.contains(e.relatedTarget)) galleryWrap.classList.remove('file-drag-active');
});
mainArea.addEventListener('drop', e => {
  if (!e.dataTransfer.types.includes('Files') || !images.length) return;
  e.preventDefault();
  galleryWrap.classList.remove('file-drag-active');
  processFiles(Array.from(e.dataTransfer.files));
});

/* ─────────────────────────────────────
   描画
───────────────────────────────────── */
function renderAll() {
  renderGallery();
  updateStatus();
  updateButtons();
  refreshUndoRedo();
}

function renderGallery() {
  if (!images.length) {
    galleryWrap.classList.remove('has-images');
    dropZone.classList.add('visible');
    kbHint.style.display = 'none';
    return;
  }
  dropZone.classList.remove('visible');
  galleryWrap.classList.add('has-images');
  kbHint.style.display = 'inline';

  galleryGrid.innerHTML = images.map((img, i) => {
    const mb  = (img.size / 1024 / 1024).toFixed(1);
    const sel = selectedIds.has(img.id) ? ' selected' : '';
    return `
      <div class="image-item${sel}" draggable="true" data-id="${img.id}">
        <div class="img-viewport">
          <img src="${img.url}" alt="${escapeHtml(img.name)}" class="img-preview" loading="lazy">
          <span class="img-num">${i + 1}</span>
          <span class="img-sel-mark">✓ 選択中</span>
        </div>
        <div class="img-footer">
          <div class="img-name" title="${escapeHtml(img.name)}">
            ${escapeHtml(img.name)}
            <span class="img-size">${mb}MB</span>
          </div>
        </div>
      </div>`;
  }).join('');

  setupDnD();
  applySize();
}

/* ─────────────────────────────────────
   スライダー
───────────────────────────────────── */
sizeSlider.addEventListener('input', () => {
  sizeVal.textContent = `${sizeSlider.value}px`;
  applySize();
});
function applySize() {
  const h = parseInt(sizeSlider.value, 10);
  document.documentElement.style.setProperty('--img-height', `${h}px`);
  document.documentElement.style.setProperty('--col-width',  `${Math.round(h * 1.1)}px`);
}
applySize();

/* ─────────────────────────────────────
   ステータス表示
───────────────────────────────────── */
function updateStatus() {
  if (images.length) {
    const mb = (images.reduce((s, i) => s + i.size, 0) / 1024 / 1024).toFixed(1);
    fileBadge.innerHTML = `<span class="badge">📁 ${images.length}枚 / ${mb}MB</span>`;
  } else {
    fileBadge.innerHTML = '';
  }

  selBadge.innerHTML = selectedIds.size
    ? `<span class="badge sel-b">✓ ${selectedIds.size}枚を選択中</span>` : '';

  const batches = Math.ceil(images.length / MAX_PER_BATCH);
  batchBadge.innerHTML = images.length > MAX_PER_BATCH
    ? `<span class="badge warn">📦 ${batches}個のZIPに分割されます</span>` : '';
}

/* ─────────────────────────────────────
   ボタン有効/無効
───────────────────────────────────── */
function updateButtons() {
  saveBtn.disabled   = !images.length;
  resetBtn.disabled  = !images.length;
  deleteBtn.disabled = !selectedIds.size;
}
updateButtons();

/* ─────────────────────────────────────
   画像間 Drag & Drop（並び替え）
───────────────────────────────────── */
function clearDropIndicators() {
  document.querySelectorAll('.image-item').forEach(i =>
    i.classList.remove('drag-over', 'drop-left', 'drop-right'));
}

function setupDnD() {
  document.querySelectorAll('.image-item').forEach(item => {
    item.addEventListener('dragstart',  onDragStart);
    item.addEventListener('dragover',   onDragOver);
    item.addEventListener('drop',       onDrop);
    item.addEventListener('dragend',    onDragEnd);
    item.addEventListener('dragleave',  () => item.classList.remove('drop-left', 'drop-right'));
  });
}

function onDragStart(e) {
  if (e.dataTransfer.types.includes('Files')) return;
  const id = this.dataset.id;
  if (!selectedIds.has(id)) { selectedIds.clear(); selectedIds.add(id); renderGallery(); }
  draggedEl  = this;
  dragSrcIds = Array.from(selectedIds);
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', 'reorder');
}

function onDragOver(e) {
  if (e.dataTransfer.types.includes('Files')) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (this === draggedEl) return;
  const rect = this.getBoundingClientRect();
  const isLeft = e.clientX < rect.left + rect.width / 2;
  this.classList.remove('drop-left', 'drop-right');
  this.classList.add(isLeft ? 'drop-left' : 'drop-right');
}

function onDrop(e) {
  if (e.dataTransfer.types.includes('Files')) return;
  e.preventDefault();
  clearDropIndicators();
  if (this === draggedEl) return;

  const targetId     = this.dataset.id;
  const oldTargetIdx = images.findIndex(i => i.id === targetId);

  const rect = this.getBoundingClientRect();
  const insertAfter = e.clientX >= rect.left + rect.width / 2;
  let insertIdx = insertAfter ? oldTargetIdx + 1 : oldTargetIdx;

  const dragSet   = new Set(dragSrcIds);
  const dragItems = dragSrcIds.map(id => images.find(i => i.id === id));

  const removedBefore = images.reduce((n, img, idx) =>
    n + (dragSet.has(img.id) && idx < insertIdx ? 1 : 0), 0);

  images = images.filter(i => !dragSet.has(i.id));
  const newIdx = Math.max(0, Math.min(insertIdx - removedBefore, images.length));
  images.splice(newIdx, 0, ...dragItems);

  selectedIds = new Set(dragSrcIds);
  saveHistory();
  renderAll();
}

function onDragEnd() {
  clearDropIndicators();
}

/* ─────────────────────────────────────
   クリック選択
───────────────────────────────────── */
galleryGrid.addEventListener('click', e => {
  const item = e.target.closest('.image-item');
  if (!item) return;
  const id = item.dataset.id;

  if (e.shiftKey && selectedIds.size) {
    const arr  = Array.from(selectedIds);
    const last = arr[arr.length - 1];
    const a    = images.findIndex(i => i.id === last);
    const b    = images.findIndex(i => i.id === id);
    const [s, t] = a < b ? [a, b] : [b, a];
    for (let i = s; i <= t; i++) selectedIds.add(images[i].id);
  } else if (e.ctrlKey || e.metaKey) {
    if (selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id);
  } else {
    selectedIds.clear();
    selectedIds.add(id);
  }
  updateButtons();
  updateStatus();
  renderGallery();
});

/* ─────────────────────────────────────
   キーボードショートカット
───────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); return; }
  if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); return; }
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size) {
    e.preventDefault(); handleDelete();
  }
});

/* ─────────────────────────────────────
   削除
───────────────────────────────────── */
deleteBtn.addEventListener('click', handleDelete);
function handleDelete() {
  if (!selectedIds.size) return;
  const n = selectedIds.size;
  if (!confirm(n === 1 ? '選択された画像を削除しますか？' : `選択された ${n} 枚を削除しますか？`)) return;
  selectedIds.forEach(id => {
    const it = images.find(i => i.id === id);
    if (it?.url?.startsWith('blob:')) { try { URL.revokeObjectURL(it.url); } catch (_) {} }
  });
  images = images.filter(i => !selectedIds.has(i.id));
  selectedIds.clear();
  saveHistory();
  renderAll();
}

/* ─────────────────────────────────────
   全リセット
───────────────────────────────────── */
resetBtn.addEventListener('click', () => {
  if (!images.length) return;
  if (!confirm('全ての画像をリセットしますか？')) return;
  images.forEach(it => {
    if (it.url?.startsWith('blob:')) { try { URL.revokeObjectURL(it.url); } catch (_) {} }
  });
  images = []; selectedIds.clear();
  history = []; historyIdx = -1;
  renderAll();
});

/* ─────────────────────────────────────
   保存（ZIP）
───────────────────────────────────── */
saveBtn.addEventListener('click', handleSave);
async function handleSave() {
  if (!images.length) return;
  const invalid = images.filter(img => !img.file?.size);
  if (invalid.length) { toast('一部の画像ファイルが無効です。再選択してください。', 'error'); return; }

  saveBtn.disabled = true;
  progressWrap.style.display = 'block';

  try {
    const batches = [];
    for (let i = 0; i < images.length; i += MAX_PER_BATCH) batches.push(images.slice(i, i + MAX_PER_BATCH));
    const ts = new Date().toISOString().slice(0, 10);

    for (let bi = 0; bi < batches.length; bi++) {
      const batch  = batches[bi];
      const suffix = batches.length > 1 ? `_part${bi + 1}` : '';
      progText.textContent = `ZIP ${bi + 1}/${batches.length}（${batch.length}枚）を処理中…`;
      await processBatch(batch, `sorted_images_${ts}${suffix}.zip`, bi, batches.length);
      await new Promise(r => setTimeout(r, 80));
    }

    const msg = batches.length > 1
      ? `${batches.length}個のZIPに分割して保存しました`
      : `${images.length}枚の画像を保存しました`;
    toast(msg, 'ok', 4000);
  } catch (err) {
    console.error(err);
    toast(`保存エラー: ${err.message}`, 'error', 5000);
  } finally {
    progressWrap.style.display = 'none';
    progFill.style.width = '0%';
    saveBtn.disabled = false;
    updateButtons();
  }
}

async function processBatch(batch, filename, bi, total) {
  const zip = new JSZip();
  for (let i = 0; i < batch.length; i++) {
    const img = batch[i];
    progFill.style.width = `${Math.min(((bi * MAX_PER_BATCH + i + 1) / images.length) * 100, 100)}%`;
    try {
      if (typeof img.file?.arrayBuffer !== 'function') continue;
      const ext       = img.name.match(/\.([^.]+)$/)?.[1] ?? '';
      const globalIdx = images.indexOf(img);
      const newName   = ext ? `${globalIdx + 1}.${ext}` : `${globalIdx + 1}`;
      zip.file(newName, await img.file.arrayBuffer());
    } catch (e) { console.error(`Error: ${img.name}`, e); }
    if (i % 50 === 0) await new Promise(r => setTimeout(r, 8));
  }
  const blob = await zip.generateAsync({
    type: 'blob', compression: 'DEFLATE',
    compressionOptions: { level: 3 }, streamFiles: true
  });
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
}
