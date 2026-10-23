# Nordic Grid Pulse

Nordic Grid Pulse is a portfolio project demonstrating industrial energy
analytics, data engineering and full-stack software development.

## Current milestone

The application currently includes:

- a Python and Pandas transformation pipeline
- input-data validation
- calculated renewable and electricity-balance metrics
- automated Python tests
- a Next.js and TypeScript dashboard
- interactive Recharts visualizations

The current dataset is fetched from the Fingrid Open Data API. Solar
production is a forecast value rather than a direct measurement.

## Architecture

Fingrid Open Data API → Python/Pandas pipeline → Supabase PostgreSQL →
Next.js dashboard.

## Technology

- Python
- Pandas
- Pytest
- Next.js
- TypeScript
- Tailwind CSS
- Recharts

## Local execution

Generate the processed dataset:

```bash
cd pipeline
python transform.py
python -m pytest
```

Start the web application:

```bash
cd web
npm install
npm run dev
```
