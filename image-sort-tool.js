const fileInput = document.getElementById('fileInput');
const galleryGrid = document.getElementById('galleryGrid');
let images = [];

fileInput.addEventListener('change', () => {
  const files = Array.from(fileInput.files);
  files.forEach(file => {
    const url = URL.createObjectURL(file);
    images.push({file: file, url: url});
  });
  renderImages();
});

function renderImages() {
  galleryGrid.innerHTML = "";
  images.forEach((imgObj, index) => {
    const img = document.createElement('img');
    img.src = imgObj.url;
    img.alt = `画像${index + 1}`;
    galleryGrid.appendChild(img);
  });
}
