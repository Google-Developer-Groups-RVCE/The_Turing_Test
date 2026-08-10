const { parseCsv } = require('../utils/csvParser');
const userStore = require('../redis/userStore');
const { hashPassword } = require('../utils/hashPassword');
const fs = require('fs');

class CsvImportService {
  async importUsers(filePath) {
    const rows = await parseCsv(filePath);
    let success = 0;
    let failed = 0;
    const errors = [];

    for (const row of rows) {
      try {
        const username = row.username?.trim();
        const password = row.password?.trim();
        
        if (!username || !password) {
          throw new Error('Missing username or password');
        }

        if (!/^RVCE26B[A-Z0-9]+$/i.test(username)) {
          throw new Error('Invalid username format');
        }

        const exists = await userStore.usernameExists(username);
        if (exists) {
          throw new Error('Username already exists');
        }

        const hashed = await hashPassword(password);
        await userStore.createUser({
          username,
          passwordHash: hashed,
          role: 'participant',
          name: row.name || '',
          createdAt: Date.now().toString(),
          status: 'active'
        });
        success++;
      } catch (err) {
        failed++;
        errors.push({ row, error: err.message });
      }
    }

    // Cleanup the uploaded file
    fs.unlink(filePath, () => {});

    return { total: rows.length, success, failed, errors };
  }
}

module.exports = new CsvImportService();
