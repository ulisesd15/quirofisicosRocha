const db = require('../config/connections');

// List users pending verification
const listPendingVerifications = async (req, res) => {
  try {
    const [users] = await db.promise().query(
      'SELECT id, full_name, email, phone, is_verified, requires_verification FROM users WHERE requires_verification = 1'
    );
    res.json({ users });
  } catch (error) {
    console.error('Error fetching pending verifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Accept or deny user verification
const verifyUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { approve, verifyForFuture } = req.body; // approve: true/false, verifyForFuture: true/false

    if (typeof approve !== 'boolean') {
      return res.status(400).json({ error: 'Missing approve boolean' });
    }

    let updateSql, updateParams;
    if (approve) {
      // If verifyForFuture is true, set is_verified=1 and requires_verification=0
      if (verifyForFuture) {
        updateSql = 'UPDATE users SET is_verified = 1, requires_verification = 0 WHERE id = ?';
        updateParams = [userId];
      } else {
        // Only approve this time, keep requires_verification=1
        updateSql = 'UPDATE users SET is_verified = 0, requires_verification = 1 WHERE id = ?';
        updateParams = [userId];
      }
    } else {
      // Deny: keep requires_verification=1, is_verified=0
      updateSql = 'UPDATE users SET is_verified = 0, requires_verification = 1 WHERE id = ?';
      updateParams = [userId];
    }

    await db.promise().query(updateSql, updateParams);
    res.json({ message: 'User verification updated' });
  } catch (error) {
    console.error('Error updating user verification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  listPendingVerifications,
  verifyUser,
};
