const { UserService } = require('../services/firestoreService');

const userService = new UserService();

function handleError(res, err) {
  const status = err && err.status ? err.status : 500;
  res.status(status).json({ error: (err && err.message) || 'Internal server error' });
}

const userController = {
  async getProfile(req, res) {
    try {
      const profile = await userService.getProfile(req.user.uid, req.user.email);
      res.json(profile);
    } catch (err) {
      handleError(res, err);
    }
  },

  async updateTier(req, res) {
    try {
      const { tier } = req.body;
      if (!tier || !['free', 'pro', 'enterprise'].includes(tier)) {
        return res.status(400).json({ error: 'Valid tier (free, pro, enterprise) is required' });
      }
      const updated = await userService.updateTier(req.user.uid, tier);
      res.json(updated);
    } catch (err) {
      handleError(res, err);
    }
  },
};

module.exports = userController;
