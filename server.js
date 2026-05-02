const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = 4000;

// ==========================================
//  BANCO DE DADOS SQLite
// ==========================================
const db = new Database(path.join(__dirname, 'database.db'));

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName   TEXT    NOT NULL,
        lastName    TEXT    NOT NULL,
        email       TEXT    NOT NULL UNIQUE,
        cpf         TEXT    NOT NULL UNIQUE,
        username    TEXT    NOT NULL UNIQUE,
        password    TEXT    NOT NULL,
        created_at  TEXT    DEFAULT (datetime('now','localtime'))
    )
`);

console.log('[DB] Banco de dados SQLite conectado -> database.db');

// ==========================================
//  MIDDLEWARE
// ==========================================
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'Pages')));
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Pages', 'index.html'));
});

// ==========================================
//  ROTAS
// ==========================================

// POST /api/register
app.post('/api/register', (req, res) => {
    const { firstName, lastName, email, cpf, username, password, confirmPassword } = req.body;

    if (!firstName || !lastName || !email || !cpf || !username || !password || !confirmPassword) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'As senhas não coincidem.' });
    }

    if (password.length < 6) {
        return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    const emailExists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (emailExists) return res.status(400).json({ message: 'Este e-mail já está cadastrado.' });

    const cpfExists = db.prepare('SELECT id FROM users WHERE cpf = ?').get(cpf);
    if (cpfExists) return res.status(400).json({ message: 'Este CPF já está cadastrado.' });

    const usernameExists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (usernameExists) return res.status(400).json({ message: 'Este usuário já está em uso.' });

    const stmt = db.prepare(`
        INSERT INTO users (firstName, lastName, email, cpf, username, password)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(firstName, lastName, email, cpf, username, password);

    // ✅ Atualiza o users.json sempre que um novo usuário é cadastrado
    atualizarUsersJson();

    console.log(`[CADASTRO] ${firstName} ${lastName} — @${username} — ID: ${result.lastInsertRowid}`);

    return res.status(201).json({
        message: 'Conta criada com sucesso!',
        user: { id: result.lastInsertRowid, firstName, lastName, username, email }
    });
});

// POST /api/login — aceita email OU username
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'E-mail/usuário e senha são obrigatórios.' });
    }

    const user = db.prepare(`
        SELECT * FROM users WHERE (email = ? OR username = ?) AND password = ?
    `).get(email, email, password);

    if (!user) {
        return res.status(401).json({ message: 'E-mail/usuário ou senha inválidos.' });
    }

    console.log(`[LOGIN] Bem-vindo, ${user.firstName} (@${user.username})!`);

    return res.json({
        message: `Bem-vindo, ${user.firstName}!`,
        user: { id: user.id, firstName: user.firstName, lastName: user.lastName, username: user.username, email: user.email }
    });
});

// GET /api/users — retorna JSON com todos os usuários (sem senha)
app.get('/api/users', (req, res) => {
    const users = db.prepare('SELECT id, firstName, lastName, email, cpf, username, created_at FROM users').all();
    return res.json(users);
});

// GET /users.json — serve o arquivo users.json diretamente
app.get('/users.json', (req, res) => {
    const filePath = path.join(__dirname, 'users.json');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.json([]);
    }
});

// ==========================================
//  FUNÇÃO: Gera/atualiza o users.json
// ==========================================
function atualizarUsersJson() {
    const users = db.prepare('SELECT id, firstName, lastName, email, cpf, username, created_at FROM users').all();
    const filePath = path.join(__dirname, 'users.json');
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf-8');
    console.log(`[JSON] users.json atualizado — ${users.length} usuário(s)`);
}

// Gera o users.json ao iniciar o servidor (sincroniza com o banco existente)
atualizarUsersJson();

// ==========================================
//  START
// ==========================================
app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(` Servidor Ativo: http://localhost:${PORT}`);
    console.log(`========================================\n`);
});