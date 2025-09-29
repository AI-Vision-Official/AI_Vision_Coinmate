// script.js
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const pdfjsLib = require('pdfjs-dist');
const { createCanvas } = require('canvas');

const dataPath = path.join(__dirname, '../data');
const booksFile = path.join(dataPath, 'books.json');
const coinsFile = path.join(dataPath, 'coins.json');
const booksFolder = path.join(__dirname, '../boeken');
const coversFolder = path.join(__dirname, '../covers');

const bookForm = document.getElementById('bookForm');
const coinForm = document.getElementById('coinForm');
const bookList = document.getElementById('bookList');
const coinList = document.getElementById('coinList');
const toggleBtn = document.getElementById('toggleTheme');

function showSection(id) {
  document.querySelectorAll('main section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function toggleTheme() {
  document.body.classList.toggle('dark');
}
toggleBtn.addEventListener('click', toggleTheme);

function loadJSON(file, callback) {
  if (fs.existsSync(file)) {
    const data = fs.readFileSync(file);
    callback(JSON.parse(data));
  } else {
    callback([]);
  }
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function renderBooks(books) {
  bookList.innerHTML = '';
  books.forEach(book => {
    const li = document.createElement('li');
    const coverPath = `../covers/${book.cover}`;
    li.innerHTML = `
      <strong>${book.title}</strong> (${book.type})<br>
      ${book.description}<br>
      <img src="${coverPath}" alt="Cover" style="max-height:100px; display:block; margin-top:5px;">
      <a href="${book.path}" target="_blank">Openen</a>
    `;
    bookList.appendChild(li);
  });
}

function renderCoins(coins) {
  coinList.innerHTML = '';
  coins.forEach(coin => {
    const li = document.createElement('li');
    const status = coin.owned ? '✔️' : '❌';
    li.textContent = `${status} ${coin.year} ${coin.country} ${coin.name} (${coin.type}) – ${coin.value}`;
    coinList.appendChild(li);
  });
}

bookForm.addEventListener('submit', e => {
  e.preventDefault();
  const newBook = {
    title: document.getElementById('bookTitle').value,
    type: document.getElementById('bookType').value,
    description: document.getElementById('bookDescription').value,
    path: document.getElementById('bookPath').value,
    cover: '' // optioneel veld voor handmatige invoer
  };
  loadJSON(booksFile, books => {
    books.push(newBook);
    saveJSON(booksFile, books);
    renderBooks(books);
    bookForm.reset();
  });
});

coinForm.addEventListener('submit', e => {
  e.preventDefault();
  const newCoin = {
    name: document.getElementById('coinName').value,
    year: parseInt(document.getElementById('coinYear').value),
    country: document.getElementById('coinCountry').value,
    type: document.getElementById('coinType').value,
    value: document.getElementById('coinValue').value,
    owned: document.getElementById('coinOwned').checked
  };
  loadJSON(coinsFile, coins => {
    coins.push(newCoin);
    saveJSON(coinsFile, coins);
    renderCoins(coins);
    coinForm.reset();
  });
});

// 📥 Drag & Drop logica voor boeken
const dropArea = document.createElement('div');
dropArea.textContent = 'Sleep hier een PDF-boek naartoe';
dropArea.style.border = '2px dashed var(--accent)';
dropArea.style.padding = '1rem';
dropArea.style.marginBottom = '1rem';
document.getElementById('library').insertBefore(dropArea, bookForm);

dropArea.addEventListener('dragover', e => {
  e.preventDefault();
  dropArea.style.backgroundColor = '#ddd';
});

dropArea.addEventListener('dragleave', () => {
  dropArea.style.backgroundColor = '';
});

dropArea.addEventListener('drop', async e => {
  e.preventDefault();
  dropArea.style.backgroundColor = '';
  const file = e.dataTransfer.files[0];
  if (!file.name.endsWith('.pdf')) return alert('Alleen PDF-bestanden a.u.b.');

  const destPath = path.join(booksFolder, file.name);
  const coverName = file.name.replace(/\.pdf$/, '.jpg');
  const coverPath = path.join(coversFolder, coverName);

  await fse.copy(file.path, destPath);

  const loadingTask = pdfjsLib.getDocument(destPath);
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });

  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');

  await page.render({ canvasContext: context, viewport }).promise;

  const buffer = canvas.toBuffer('image/jpeg');
  fs.writeFileSync(coverPath, buffer);

  const newBook = {
    title: file.name.replace(/\.pdf$/, ''),
    type: 'boek',
    description: 'Ingesleept PDF-bestand',
    path: `../boeken/${file.name}`,
    cover: coverName
  };
  loadJSON(booksFile, books => {
    books.push(newBook);
    saveJSON(booksFile, books);
    renderBooks(books);
  });
});

document.addEventListener('DOMContentLoaded', () => {
  loadJSON(booksFile, renderBooks);
  loadJSON(coinsFile, renderCoins);
});
