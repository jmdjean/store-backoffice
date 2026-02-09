# Store Backoffice

Monorepo com **Angular** (frontend) e **Node.js** (backend), usando o tema **Glass Admin** (TemplateMo 607 - 3D Glassmorphism).

## Estrutura do projeto

```
store-backoffice/
├── apps/
│   ├── frontend/          # Aplicação Angular (tema Glass Admin)
│   └── backend/            # API Node.js (Express)
├── package.json           # Workspaces (npm workspaces)
└── README.md
```

## Pré-requisitos

- Node.js >= 20
- npm >= 10

## Instalação

```bash
npm install
```

## Desenvolvimento

**Frontend (Angular):**
```bash
npm run frontend
```
Abre em `http://localhost:4200`

**Backend (Node.js):**
```bash
npm run backend
```
API em `http://localhost:3000`

## Build

```bash
npm run frontend:build
npm run backend:build
```

## Tema

O frontend utiliza o tema **Glass Admin** (TemplateMo 607) com:
- Paleta emerald/gold
- Glassmorphism (blur, transparência)
- Modo claro/escuro
- Fontes Outfit e Space Mono
