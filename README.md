# Casal Navy 🏋️💙

App de treino instalável (PWA) — Android e iPhone. Plano de treino com o mesmo
nível de detalhe da planilha, registro diário, histórico e evolução das cargas.

## O que o app faz

- **Hoje** — mostra o treino do dia na rotação (Dia A: Costas/Bíceps → Dia B:
  Peito/Ombro/Tríceps → Dia C: Pernas/Glúteo). Cada exercício tem Plano A
  (principal) e Plano B (alternativo), séries, repetições, técnica, descanso e
  carga em lbs. Dá para marcar séries concluídas, usar o timer de descanso e
  anotar observações. Ao concluir, o treino é salvo e a rotação avança sozinha.
- **Histórico** — lista de treinos, detalhe de cada sessão e gráfico de
  progressão da carga por exercício. Botão para importar o histórico da
  planilha (ago/2025 → set/2026).
- **Plano** — visualiza e edita o plano: trocar exercícios A/B, séries, reps,
  técnica, descanso, adicionar/remover/reordenar, trocar de modelo
  (rotação A/B/C ou seg–sáb). É aqui que o treino é atualizado a cada 3 meses —
  sem mexer no código.
- **Conta** — contas de verdade: criar conta/entrar. No modo local a conta fica
  no aparelho; conectando o Supabase (grátis) a conta sincroniza entre o
  Android e o iPhone. Backup em JSON e exportação em CSV no formato da planilha.

## Rodar localmente

Qualquer servidor estático serve (não precisa de build):

```bash
cd casal-navy
python3 -m http.server 8080
# abrir http://localhost:8080
```

Para instalar no celular: abra o link do app no navegador → "Adicionar à tela
inicial" (Android/Chrome) ou Compartilhar → "Adicionar à Tela de Início"
(iPhone/Safari).

## Contas na nuvem (Supabase, grátis)

1. Crie um projeto em https://supabase.com
2. No **SQL Editor**, cole e rode o arquivo `supabase/schema.sql`
3. Em **Authentication → Sign In / Up**, desative **"Confirm email"**
   (para entrar direto, sem link de confirmação)
4. Em **Project Settings → API**, copie a **URL** e a **anon key**
5. No app, vá em **Conta → Banco de dados** e cole os dois valores

Pronto: crie sua conta no app (Tony) e a da Eliza — cada um vê só os próprios
dados (as policies RLS do schema garantem isso). Os dois usam o mesmo link do
app, cada um no seu celular.

## Estrutura

```
index.html          tela do app
css/style.css       tema marinho
js/plans.js         plano padrão (rotação A/B/C + modelo seg–sáb)
js/history_seed.js  histórico da planilha (para importação)
js/sb.js            cliente mínimo do Supabase (REST, sem dependências)
js/store.js         contas + dados (local ou nuvem)
js/app.js           telas e lógica
manifest.json       PWA instalável
sw.js               funciona offline
icons/              ícones do app
supabase/schema.sql tabelas + segurança (RLS)
```

## Licença

MIT — veja `LICENSE`.
