const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin', 'owner'], default: 'admin' },
  },
  { timestamps: true }
);

// email field already marked unique in schema

module.exports = mongoose.model('User', userSchema);
