const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const path = require("path");

const app = express();
const db = new sqlite3.Database("./db.sqlite");

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Upload sem restrições
const upload = multer({ dest: "uploads/" });

// Criar tabelas e inserir usuário padrão
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        password TEXT
    )`);

  db.run(`CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        content TEXT
    )`);

  // Inserir usuário admin se não existir
  db.get(`SELECT * FROM users WHERE username = 'admin'`, (err, row) => {
    if (!row) {
      db.run(`INSERT INTO users (username, password) VALUES ('admin', '1234')`);
      console.log("Usuário admin criado: admin / 1234");
    }
  });
});

// Página inicial
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Login vulnerável a SQL Injection
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
  console.log("Executando query:", query);

  db.get(query, (err, row) => {
    if (row) {
      res.redirect(`/notes?user=${row.id}`);
    } else {
      res.send("Credenciais inválidas");
    }
  });
});

// Listar notas (IDOR + XSS)
app.get("/notes", (req, res) => {
  const { user } = req.query;
  db.all(`SELECT * FROM notes WHERE user_id = ${user}`, (err, rows) => {
    let html = `<h1>Notas do usuário ${user}</h1>
                    <form method="POST" action="/notes/add?user=${user}">
                        <input name="content" placeholder="Nova nota" />
                        <button type="submit">Adicionar</button>
                    </form>
                    <ul>`;
    rows.forEach((note) => {
      html += `<li>${note.content} - <a href="/edit/${note.id}">Editar</a></li>`;
    });
    html += `</ul>
                 <a href="/">Sair</a>`;
    res.send(html);
  });
});

// Adicionar nota sem sanitização
app.post("/notes/add", (req, res) => {
  const { content } = req.body;
  const { user } = req.query;
  db.run(`INSERT INTO notes (user_id, content) VALUES (${user}, '${content}')`);
  res.redirect(`/notes?user=${user}`);
});

// Upload inseguro
app.post("/upload", upload.single("file"), (req, res) => {
  res.send(`Arquivo enviado: ${req.file.originalname}`);
});

app.listen(3000, () =>
  console.log("🚀 SaaS vulnerável rodando em http://localhost:3000")
);
