import { getConnectionString } from "@netlify/database";
import pg from "pg";

export const pool = new pg.Pool({
  connectionString: getConnectionString(),
  max: 1,
});