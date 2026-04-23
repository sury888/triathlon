// controllers/userController.js
const User = require('../models/User');
const League = require('../models/League'); // you’ll create this model
const Pick = require('../models/Pick');

// controllers/authController.js
const jwt = require('jsonwebtoken');




exports.createUser = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // 1. Confirm password match
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    // 2. Strong password validation
    const strongPasswordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({
        error: "Password must be at least 8 characters, include one uppercase letter and one special character"
      });
    }

    // 3. Create user
    const user = await User.create({ name, email, password });
    res.status(201).json(user);

  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Email already exists" });
    }
    if (err.name === "ValidationError") {
      return res.status(400).json({
        error: "Validation Failed",
        details: Object.values(err.errors).map(e => e.message)
      });
    }
    console.error("Create user error:", err);
    res.status(500).json({ error: "Server Error" });
  }
};


exports.listUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Server Error' });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Server Error' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const allowed = ["name", "avatar", "bio"]; // email + password removed
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (allowed.includes(key)) updates[key] = req.body[key];
    });

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updated);

  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Server Error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ ok: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Server Error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ error: "User not found" });

    const match = await user.comparePassword(oldPassword);
    if (!match) return res.status(400).json({ error: "Old password incorrect" });

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });

  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const allowed = ["name", "email", "avatar", "bio"];
    const updates = {};

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // If email is being changed, require password
    if (req.body.email) {
      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ error: "Password required to change email" });
      }

      const match = await user.comparePassword(password);
      if (!match) {
        return res.status(400).json({ error: "Password incorrect" });
      }
    }

    Object.keys(req.body).forEach(key => {
      if (allowed.includes(key)) updates[key] = req.body[key];
    });

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.json(updated);

  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.params.id;
    const { password } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!password) {
      return res.status(400).json({ error: "Password required to delete account" });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(400).json({ error: "Password incorrect" });
    }

    await User.findByIdAndDelete(userId);

    await League.updateMany(
      { members: userId },
      { $pull: { members: userId } }
    );

    res.json({ message: "Account deleted successfully" });

  } catch (err) {
    console.error("Delete account error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getActivity = async (req, res) => {
  try {
    const userId = req.params.id;

    const leagues = await League.find({ members: userId })
      .select('name createdAt');

    const picks = await Pick.find({ user: userId })
      .populate('race', 'name date series')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      leaguesJoined: leagues,
      recentPicks: picks
    });

  } catch (err) {
    console.error('User activity error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getSecurity = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('email createdAt updatedAt');

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      email: user.email,
      createdAt: user.createdAt,
      lastUpdated: user.updatedAt,
      loginMethods: ['password', 'google']
    });

  } catch (err) {
    console.error('User security error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('preferences');

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user.preferences);

  } catch (err) {
    console.error('Get preferences error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const allowed = ['theme', 'notificationChannel', 'notifyAbout'];
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (allowed.includes(key)) {
        updates[`preferences.${key}`] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('preferences');

    res.json(user.preferences);

  } catch (err) {
    console.error('Update preferences error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("name email avatar bio createdAt");

    res.json(user);

  } catch (err) {
    console.error("Get settings error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const allowed = ["avatar", "bio"];
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (allowed.includes(key)) updates[key] = req.body[key];
    });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    res.json(user);

  } catch (err) {
    console.error("Update settings error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
