// backend/src/server.ts
import dotenv from "dotenv";
dotenv.config();                 // load .env before anything else

import app from "./app";

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
