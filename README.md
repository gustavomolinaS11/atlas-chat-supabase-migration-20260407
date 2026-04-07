# Atlas Chat

Projeto de chat web com dois trilhos:

- `backup/local-storage-demo/`: snapshot funcional da versao atual baseada em `localStorage`.
- `src/` + `supabase/`: estrutura inicial para migracao para Supabase com auth real, banco, realtime e storage.

## Estrutura

- `index.html`, `chat.html`, `settings.html`: interface atual do app demo.
- `app.js`, `auth.js`, `settings.js`, `store.js`: runtime atual da demo local.
- `backup/local-storage-demo/`: copia preservada antes da migracao para backend real.
- `src/config/`: configuracoes da nova camada remota.
- `src/lib/`: cliente Supabase e mapeadores.
- `src/services/remote/`: servicos para auth, perfis, conversas, mensagens e storage.
- `supabase/schema.sql`: schema inicial, triggers e politicas RLS.
- `docs/`: arquitetura e plano de migracao.

## Proximo passo para backend real

1. Criar um projeto no Supabase.
2. Executar `supabase/schema.sql` no SQL Editor.
3. Copiar `src/config/supabase.example.js` para `src/config/supabase.js`.
4. Preencher `url` e `anonKey` no arquivo novo.
5. Ligar `auth.js`, `app.js` e `settings.js` aos servicos em `src/services/remote/`.

## Observacao

O app atual continua sendo demo local. Os arquivos em `src/` e `supabase/` sao a base para a versao hospedavel com backend real.
