const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: "hopper.proxy.rlwy.net",   // Railway host
  user: "root",                    // Railway user
  password: "OHOIgFHLdciPvotdspPPOkekhZSgELZv",       // 🔴 replace this
  database: "railway",             // Railway DB name
  port: 40808,                     // Railway port
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection on startup
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL connected successfully');
    conn.release();
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
  }
})();

module.exports = pool;