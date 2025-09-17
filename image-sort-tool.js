// === 既存コード（そのまま） ===
const fileInput = document.getElementById('fileInput');
const galleryGrid = document.getElementById('galleryGrid');
let images = [];

fileInput.addEventListener('change', () => {
  const files = Array.from(fileInput.files);
  files.forEach(file => {
    const url = URL.createObjectURL(file);
    images.push({ file: file, url: url, name: file.name });
  });
  renderImages();
});

function renderImages() {
  galleryGrid.innerHTML = "";
  images.forEach((imgObj, index) => {
    const img = document.createElement('img');
    img.src = imgObj.url;
    img.alt = `画像${index + 1}`;
    img.title = imgObj.name || `image_${index + 1}`;
    galleryGrid.appendChild(img);
  });
}

// === ここから追記 ===

// 1) Blobを即ダウンロードする共通関数 [web:102][web:103]
function downloadBlobAsFile(blob, filename) {
  const url = URL.createObjectURL(blob);       // 一時URL作成 [web:103]
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'sorted-images.zip'; // 保存名 [web:102]
  document.body.appendChild(a);
  a.click();                                    // 自動クリック [web:102]
  a.remove();
  URL.revokeObjectURL(url);                     // 後片付け [web:103]
}

// 2) 並び替え済みimagesからZIPを作る [web:102]
async function buildZipFromImages() {
  // JSZipを使用（tool.htmlで <script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script> を読み込み） [web:102]
  const zip = new JSZip();
  // フォルダを用意して中に入れる例
  const folder = zip.folder('images');

  // images配列の順番＝並び順で保存
  // File/Blobをそのまま追加すると拡張子も保てます
  for (let i = 0; i < images.length; i++) {
    const imgObj = images[i];
    const file = imgObj.file; // Fileオブジェクト
    // 元名があれば採用、なければ連番
    const baseName = file && file.name ? file.name : `image_${String(i + 1).padStart(4,'0')}.jpg`;
    const arrayBuffer = await file.arrayBuffer(); // ZIPへ入れるためにバイナリ取得 [web:102]
    folder.file(baseName, arrayBuffer);          // そのまま入れる
  }

  // ArrayBuffer形式で生成（Blobに包む前段階） [web:102]
  const zipArrayBuffer = await zip.generateAsync({ type: 'arraybuffer' });
  return zipArrayBuffer;
}

// 3) エクスポート実行関数（ZIP→Blob→DL） [web:102][web:103]
async function exportSortedAsZip() {
  if (!images.length) {
    alert('画像がありません');
    return;
  }
  // ZIPバイナリ作成
  const zipArrayBuffer = await buildZipFromImages(); // [web:102]
  // Blobに包む（MIMEはzip） [web:102]
  const blob = new Blob([zipArrayBuffer], { type: 'application/zip' });
  // ダウンロード
  downloadBlobAsFile(blob, 'sorted-images.zip');     // [web:102][web:103]
}

// 4) 画面上の「エクスポート」ボタンにフック
// tool.html側に <button id="exportZipBtn">ZIPで保存</button> を追加してください
const exportBtn = document.getElementById('exportZipBtn');
if (exportBtn) {
  exportBtn.addEventListener('click', exportSortedAsZip);
} else {
  // ボタンがまだ無い場合、仮で作って差し込む（任意）
  const btn = document.createElement('button');
  btn.id = 'exportZipBtn';
  btn.textContent = 'ZIPで保存';
  btn.style.margin = '10px 0';
  btn.addEventListener('click', exportSortedAsZip);
  // ギャラリーの上に置く
  if (galleryGrid && galleryGrid.parentElement) {
    galleryGrid.parentElement.insertBefore(btn, galleryGrid);
  } else {
    document.body.appendChild(btn);
  }
}
