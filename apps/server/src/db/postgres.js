require('dotenv').config();
const {Pool} = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Example: postgres://user:pass@host:5432/dbname
  ssl: {
    rejectUnauthorized: false, // Required for GCP SSL
  },
});

module.exports = pool;
