# Arquitetura proposta

## Frontend estatico

- `index.html`: login/cadastro
- `chat.html`: conversas, grupos, mensagens
- `settings.html`: perfil, preferencias, privacidade

## Backend com Supabase

### Auth
- `auth.users`
- `profiles`
- `user_settings`

### Conversas
- `conversations`
- `conversation_members`
- `conversation_pins`

### Mensagens
- `messages`
- `message_attachments`
- `message_reactions`
- `message_favorites`

### Storage
- bucket `avatars`
- bucket `conversation-media`
- bucket `message-uploads`

## Regras centrais

- so membros da conversa podem ler mensagens daquela conversa
- so o autor pode editar/apagar a propria mensagem
- grupos so podem ser alterados por admin
- cada usuario pode ter apenas 1 reacao por mensagem
- cada usuario pode manter apenas 1 pin por conversa
- perfil so pode ser editado pelo proprio usuario
