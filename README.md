# Controle de Estoque (NÃO IMPLEMENTADO)

![Status](https://img.shields.io/badge/Status-Vers%C3%A3o%20Final-success)

Sistema para controle de estoque e movimentação de inversores. 
O projeto usa React no front-end e roda dentro do Google Apps Script (GAS), usando o Google Sheets como banco de dados.

## Como rodar localmente

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## Como publicar (Deploy)

1. Gere o build do projeto:
   ```bash
   npm run build
   ```

2. Envie para o Google Apps Script usando o clasp:
   ```bash
   clasp push
   ```

## Estrutura do projeto

- `/src`: Código do front-end (React).
- `/server`: Funções do back-end (Apps Script) que acessam as planilhas.
- `appsscript.json`: Configuração do projeto no GAS.
