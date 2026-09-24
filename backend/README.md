# DailyLang Backend

## Database Commands

Run these commands from the `backend` directory:

```bash
cd backend

# Create or verify the database tables.
npm run migrate

# Reset predefined scenarios from the seed source file.
npm run migrate:refresh-seeds
```

`npm run migrate` only creates or verifies the database schema. It does not replace any phrase data.

`npm run migrate:refresh-seeds` replaces the persisted data for every predefined scenario with the seed phrases from `src/data/phrases.ts`. This resets changes made to those scenarios, including:

- phrase reordering
- manually added phrases
- other changes to the persisted predefined scenario data

Generated-only scenarios are not affected by this command.

## Restart After Resetting Seeds

The backend loads phrase data into memory when it starts. After refreshing the seeds, restart both development servers so the backend reloads the updated database data and the frontend reloads the current API state.

From the repository root, stop the existing development servers and start them again:

```bash
npm run dev:backend
npm run dev:frontend
```

Alternatively, use two terminals:

```bash
# Terminal 1
cd backend
npm run dev
```

```bash
# Terminal 2
cd frontend
npm run dev
```

Then open the frontend at `http://localhost:5173`.
