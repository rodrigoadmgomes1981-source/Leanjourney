# Lean Journey — Arpen Saúde | Unimed Araçatuba

Versão 2.0 responsiva em React + Vite.

## Novidades
- Mapa mental/fluxo visual completo no resumo final
- Identificação de hotspots no próprio mapa
- Exportação do relatório final em PDF
- Identidade visual Arpen no sistema e no PDF
- Resumo AS-IS, métricas Lean e análise estratégica Black Belt

## Rodar localmente
```bash
npm install
npm run dev
```

## Build de produção
```bash
npm run build
```

> A marca visual incluída é uma representação vetorial integrada ao sistema. Para usar o arquivo oficial exato da Arpen, substitua o componente `ArpenLogo` pelo PNG/SVG oficial.


## Upgrade VSM Executivo
Inclui classificação VA/NVA, criticidade automática, gargalo, VSM AS-IS, cenário TO-BE sugerido e comparação de Lead Time.


## Upgrade Gestão Executiva
- Plano de Ação 5W2H gerado a partir das etapas
- Classificação automática de impacto, esforço e prioridade
- Identificação de Quick Wins
- Matriz Impacto × Esforço
- Comparação AS-IS × TO-BE
- Ganho potencial em minutos e percentual
- Estrutura pronta para evolução com persistência de responsável, prazo, custo e status


## Identidade visual oficial
Esta versão usa a logo oficial da ARPEN fornecida pelo usuário.
Arquivo: `public/logo-arpen.png`.

A logo foi incorporada para uso no sistema e também nas visualizações destinadas à impressão/exportação em PDF.


## Dashboard de avaliações
Ao finalizar uma avaliação, o sistema salva o registro no armazenamento local do navegador e direciona para o Dashboard de Avaliações.

Recursos:
- Histórico de todas as avaliações realizadas no navegador;
- Visualizar (ícone de olho);
- Editar (ícone de lápis);
- Apagar com confirmação (ícone de lixeira);
- KPIs consolidados: total de avaliações, Lead Time médio, redução potencial média e avaliações críticas;
- Nova avaliação diretamente pelo dashboard;
- Logo oficial ARPEN atualizada em `public/logo-arpen.png`.

Observação: nesta versão os dados são persistidos em `localStorage`. Para uso multiusuário/online compartilhado, a próxima etapa recomendada é Supabase ou outro banco central.
