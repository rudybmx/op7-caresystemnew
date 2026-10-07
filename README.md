# op7-caresystemnew

Landing page OP7 exportada da VPS cypher em 07/10/2026.

- **Domínio:** caresystemnew.op7pages.website · kit-protocolo-lipax.caresystems.com.br
- **Como roda:** nginx estático (Dockerfile), porta 80
- **Subir:** `docker build -t op7-caresystemnew .` e `docker run -d -p <porta>:<porta da linha acima> op7-caresystemnew`
- **Atenção:** O formulário envia os leads pra um webhook no n8n da Qózt (n8n.qozt.com.br). Troque pelo seu, se for o caso. O domínio kit-protocolo-lipax.caresystems.com.br é do cliente e aponta direto pro servidor (sem Cloudflare).
