# Contributing to OpenRadio Cloud

Thanks for contributing.

## Development Setup

1. Copy env:

```bash
cp .env.example .env
```

2. Install deps:

```bash
npm install
```

3. Start infra:

```bash
docker compose up -d postgres redis icecast liquidsoap
```

4. Sync schema and seed:

```bash
npm run prisma:push
npm run prisma:seed
```

5. Run app:

```bash
npm run dev
```

## Pull Request Checklist

- Keep scope focused.
- Add/adjust tests when changing behavior.
- Run:

```bash
npm run lint
npm run typecheck
npm run build
```

- Do not commit secrets.
- Keep legal boundary: no copied proprietary branding/assets/code from third-party products.

## Coding Guidelines

- TypeScript strict mode only.
- Prefer server-side data fetching/actions for authenticated flows.
- Keep API and dashboard behavior aligned.
- Keep streaming configs explicit and documented.
