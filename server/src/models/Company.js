import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const companySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true
    },
    companyKey: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

// Method to verify password (supports bcrypt hash and plaintext fallback with auto-upgrade)
companySchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password || !candidatePassword) return false;
  if (this.password === candidatePassword) {
    try {
      this.password = await bcrypt.hash(candidatePassword, 10);
      await this.save();
    } catch (e) {
      console.error('[Auth] Failed to auto-hash plaintext password:', e);
    }
    return true;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

export const Company = mongoose.model('Company', companySchema);
