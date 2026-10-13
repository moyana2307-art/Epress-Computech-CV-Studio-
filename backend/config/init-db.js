// Creates the "epress_cv_studio" database and its tables.
//
// Run it once (or any time you change the schema) with:
//     npm run db:init
//
// It is safe to run more than once: every statement uses "IF NOT EXISTS",
// so it will not delete existing data.

require('dotenv').config();
const mysql = require('mysql2/promise');

// The four tables we need, described in plain English:
//
//   staff              -> the people who log in (their password is hashed)
//   clients            -> the people we write CVs for
//   documents          -> one saved CV or cover letter (with its latest content)
//   document_versions  -> a history of every saved version of a document
//
// Each document belongs to exactly one client (client_id).
// Each version belongs to exactly one document (document_id).

const statements = [
  `CREATE TABLE IF NOT EXISTS staff (
     id            INT AUTO_INCREMENT PRIMARY KEY,
     name          VARCHAR(120) NOT NULL,
     email         VARCHAR(190) NOT NULL UNIQUE,
     password_hash VARCHAR(255) NOT NULL,
     role          VARCHAR(50) NOT NULL DEFAULT 'staff',
     created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS clients (
     id                INT AUTO_INCREMENT PRIMARY KEY,
     full_name         VARCHAR(160) NOT NULL,
     phone             VARCHAR(40),
     email             VARCHAR(190),
     raw_information   TEXT,
     target_job_title  VARCHAR(160),
     job_description   TEXT,
     notes             TEXT,
     created_by        INT,
     created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     INDEX idx_clients_name (full_name),
     INDEX idx_clients_phone (phone)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS documents (
     id              INT AUTO_INCREMENT PRIMARY KEY,
     client_id       INT NOT NULL,
     document_type   VARCHAR(40) NOT NULL DEFAULT 'cv',
     template        VARCHAR(60) NOT NULL DEFAULT 'modern',
     title           VARCHAR(200),
     content_json    LONGTEXT,
     file_path       VARCHAR(255),
     current_version INT NOT NULL DEFAULT 1,
     created_by      INT,
     created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     INDEX idx_documents_client (client_id),
     CONSTRAINT fk_documents_client
       FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS document_versions (
     id             INT AUTO_INCREMENT PRIMARY KEY,
     document_id    INT NOT NULL,
     version_number INT NOT NULL,
     content_json   LONGTEXT,
     file_path      VARCHAR(255),
     created_by     INT,
     created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     INDEX idx_versions_document (document_id),
     CONSTRAINT fk_versions_document
       FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

async function main() {
  const dbName = process.env.DB_NAME || 'epress_cv_studio';

  // First connect WITHOUT a database, so we can create it if needed.
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: false,
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4`
    );
    await connection.query(`USE \`${dbName}\``);

    for (const sql of statements) {
      await connection.query(sql);
    }

    console.log(`Database "${dbName}" is ready.`);
    console.log('Tables: staff, clients, documents, document_versions');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Could not set up the database:', error.message);
  console.error('Is MySQL running? Check your .env values.');
  process.exit(1);
});
