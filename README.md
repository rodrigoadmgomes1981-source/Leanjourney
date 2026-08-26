# Lean Journey ARPEN — versão estável

Projeto React + Vite reconstruído em base limpa.

## Como rodar
```bash
npm install
npm run dev
```

## Fluxo validado na estrutura
1. Iniciar avaliação
2. Preencher/adicionar etapas
3. Finalizar avaliação
4. Salvar avaliação
5. Abrir Dashboard de Avaliações
6. Visualizar, editar ou apagar
7. Exportar resumo pelo comando de impressão do navegador (Salvar como PDF)

## Persistência
Nesta versão, o histórico fica salvo no `localStorage` do navegador. Para uso multiusuário, o próximo passo é conectar a um banco central.


## Subetapas por etapa
Cada etapa principal agora pode conter subetapas próprias. No rodapé do mapeamento existem três ações:
1. Incluir subetapa
2. Próxima etapa
3. Finalizar avaliação

As subetapas possuem os mesmos campos Lean da etapa principal e participam dos cálculos de processamento, espera, Lead Time, valor agregado, desperdícios, gargalos e análise final.
