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

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

module.exports = pool;
