import { createServer } from 'node:http';
import { Store } from '../store/db.ts';
import { createHandler } from './app.ts';

const port = Number(process.env.PORT ?? 3000);
const store = new Store(process.env.OMBRE_DB);
createServer(createHandler(store)).listen(port, () => {
  console.log(`Ombre running at http://localhost:${port}`);
});
