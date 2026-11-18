This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

For normal use and load-time testing, run the optimized production server:

```bash
npm run build
npm run start
```

Development mode compiles pages as you open them. `npm run dev` uses Turbopack;
`npm run dev:webpack` is available if Webpack is needed.

Run `npm run test:performance` to verify that the smaller dashboard response
preserves survey filters, totals, charts, and submission ordering. With a local
production server on port 3001 and Playwright installed, `npm run test:load`
measures browser loading and checks navigation, table interactions, and Excel
downloads using an installed Chrome browser. Install the optional browser test
dependency with `npm install --no-save playwright` if needed.
Set `PERF_BASE_URL` for another local port or `PERF_BROWSER=msedge` to use Edge.
The browser check signs in with a local administrator account and only accepts
a localhost or 127.0.0.1 URL.

## Metrics documentation

See **[METRICS.md](./METRICS.md)** for definitions, formulas, and logic for every KPI on the Tracking page and main Dashboard (success rate, form completion, consent, untracked breakdown, protocol targets, and more).

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
