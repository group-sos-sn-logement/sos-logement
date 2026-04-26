/* 
    db.js

هذا سلك الكهرباء 🔌
    يربط:
    Node.js ↔ PostgreSQL

    كل مرة تسوي:

    pool.query(...)


    أنت فعليًا تتكلم مع قاعدة البيانات عبر هذا الملف.
*/

const { Pool } = require('pg');
require('dotenv').config();

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;
