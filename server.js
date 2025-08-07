const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const xml2js = require("xml2js");

const app = express();
const db = new sqlite3.Database("./db.sqlite");

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

// Middleware vulnerável - sem proteção CSRF, sem rate limiting
app.use((req, res, next) => {
  // Log de debug com informações sensíveis
  console.log(`[${new Date()}] ${req.method} ${req.url} - IP: ${req.ip} - Headers:`, req.headers);
  next();
});

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

  // Inserir usuários de teste vulneráveis
  db.run(`INSERT OR IGNORE INTO users (username, password) VALUES ('guest', 'guest')`);
  db.run(`INSERT OR IGNORE INTO users (username, password) VALUES ('test', '')`); // Senha vazia
  db.run(`INSERT OR IGNORE INTO users (username, password) VALUES ('root', 'toor')`);
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

// VULNERABILIDADE: Path Traversal - Leitura de arquivos do sistema
app.get("/file", (req, res) => {
  const { path: filePath } = req.query;
  if (!filePath) {
    return res.send("Uso: /file?path=arquivo.txt");
  }
  
  // Vulnerável a path traversal - sem sanitização
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      res.send(`Erro ao ler arquivo: ${err.message}`);
    } else {
      res.send(`<pre>${data}</pre>`);
    }
  });
});

// VULNERABILIDADE: Command Injection
app.post("/ping", (req, res) => {
  const { host } = req.body;
  if (!host) {
    return res.send("Host é obrigatório");
  }
  
  // Execução direta sem sanitização - command injection
  exec(`ping -c 3 ${host}`, (error, stdout, stderr) => {
    if (error) {
      res.send(`<pre>Erro: ${error.message}</pre>`);
    } else {
      res.send(`<pre>${stdout}</pre>`);
    }
  });
});

// VULNERABILIDADE: Information Disclosure - Endpoint de debug
app.get("/debug", (req, res) => {
  const info = {
    environment: process.env,
    cwd: process.cwd(),
    version: process.version,
    platform: process.platform,
    users: []
  };
  
  // Expor todos os usuários com senhas
  db.all("SELECT * FROM users", (err, rows) => {
    info.users = rows;
    res.json(info);
  });
});

// VULNERABILIDADE: SQL Injection em busca
app.get("/search", (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.send(`
      <form method="GET">
        <input name="q" placeholder="Buscar notas..." />
        <button>Buscar</button>
      </form>
    `);
  }
  
  // SQL injection via LIKE
  const query = `SELECT n.*, u.username FROM notes n 
                 JOIN users u ON n.user_id = u.id 
                 WHERE n.content LIKE '%${q}%'`;
  
  db.all(query, (err, rows) => {
    if (err) {
      res.send(`Erro SQL: ${err.message}`);
    } else {
      let html = `<h2>Resultados para: ${q}</h2><ul>`;
      rows.forEach(row => {
        html += `<li><strong>${row.username}:</strong> ${row.content}</li>`;
      });
      html += '</ul><a href="/search">Nova busca</a>';
      res.send(html);
    }
  });
});

// VULNERABILIDADE: XXE (XML External Entity)
app.post("/import", (req, res) => {
  const { xml } = req.body;
  if (!xml) {
    return res.send(`
      <form method="POST">
        <textarea name="xml" placeholder="Cole seu XML aqui..."></textarea>
        <button>Importar XML</button>
      </form>
    `);
  }
  
  // Parser XML vulnerável a XXE
  const parser = new xml2js.Parser({
    async: false,
    explicitArray: false,
    // Vulnerável - permite entidades externas
    explicitChildren: true,
    preserveChildrenOrder: true
  });
  
  try {
    parser.parseString(xml, (err, result) => {
      if (err) {
        res.send(`Erro XML: ${err.message}`);
      } else {
        res.json({ success: true, data: result });
      }
    });
  } catch (e) {
    res.send(`Erro: ${e.message}`);
  }
});

// VULNERABILIDADE: Local File Inclusion
app.get("/template", (req, res) => {
  const { file } = req.query;
  if (!file) {
    return res.send(`
      <h2>Templates disponíveis:</h2>
      <a href="/template?file=header.html">Header</a><br>
      <a href="/template?file=footer.html">Footer</a><br>
      <a href="/template?file=config.json">Config</a>
    `);
  }
  
  // LFI vulnerável - sem sanitização do caminho
  const templatePath = `./templates/${file}`;
  fs.readFile(templatePath, "utf8", (err, data) => {
    if (err) {
      // Exposição de informações do sistema
      res.send(`Template não encontrado: ${templatePath}<br>Erro: ${err.message}`);
    } else {
      res.send(data);
    }
  });
});

// VULNERABILIDADE: Weak Session Management
const sessions = {}; // Armazenamento inseguro em memória

app.post("/session/create", (req, res) => {
  const { username } = req.body;
  // Session ID previsível
  const sessionId = `sess_${username}_${Date.now()}`;
  sessions[sessionId] = { username, created: Date.now() };
  
  res.json({ sessionId, message: "Sessão criada" });
});

app.get("/session/info", (req, res) => {
  const { sessionId } = req.query;
  const session = sessions[sessionId];
  
  if (session) {
    res.json({ session, allSessions: sessions }); // Vaza todas as sessões
  } else {
    res.json({ error: "Sessão não encontrada", allSessions: sessions });
  }
});

// VULNERABILIDADE: Mass Assignment
app.post("/user/update", (req, res) => {
  const { id, ...userData } = req.body;
  
  // Mass assignment - aceita qualquer campo
  const fields = Object.keys(userData).join(", ");
  const values = Object.values(userData).map(v => `'${v}'`).join(", ");
  
  if (fields && values) {
    const query = `UPDATE users SET ${Object.keys(userData).map(k => `${k} = ?`).join(", ")} WHERE id = ?`;
    db.run(query, [...Object.values(userData), id], (err) => {
      if (err) {
        res.json({ error: err.message });
      } else {
        res.json({ success: true, updated: userData });
      }
    });
  } else {
    res.json({ error: "Nenhum campo para atualizar" });
  }
});

app.listen(3000, () =>
  console.log("🚀 SaaS vulnerável rodando em http://localhost:3000")
);
