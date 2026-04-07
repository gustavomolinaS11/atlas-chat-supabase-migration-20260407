# Plano de migracao

## Fase 1
- substituir auth local por Supabase Auth
- criar `profiles` e `user_settings`
- manter UI atual consumindo backend remoto

## Fase 2
- mover direct chats e grupos para o banco
- mover mensagens, favoritos, pins e reacoes
- ativar Realtime por conversa

## Fase 3
- mover avatar, foto de grupo e anexos para Storage
- persistir recibos de leitura e digitando em realtime

## Fase 4
- remover dependencia do `store.js` local
- separar UI em modulos menores dentro de `src/`
