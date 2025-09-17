// blob-download.js
export function downloadBlobAsFile(blob, filename) {
  const url = URL.createObjectURL(blob);    // 一時URLを発行 [web:103]
  const a = document.createElement('a');    // ダウンロード用リンクを生成 [web:102]
  a.href = url;
  a.download = filename;                    // 保存名を指定 [web:102]
  document.body.appendChild(a);
  a.click();                                // 自動クリックで保存開始 [web:102]
  a.remove();
  URL.revokeObjectURL(url);                 // 一時URLを解放してメモリ節約 [web:103]
}
