const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxLength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    minLength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  avatar: {
    type: String,
    default: '',
  },
  fitnessGoals: {
    type: String,
    default: '',
    maxLength: [500, 'Fitness goals cannot exceed 500 characters']
  },
  preferences: {
    theme: { 
      type: String, 
      enum: ['light', 'dark'], 
      default: 'dark' 
    },
    units: { 
      type: String, 
      enum: ['kg', 'lbs'], 
      default: 'lbs' 
    },
    notificationsEnabled: { 
      type: Boolean, 
      default: true 
    }
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  profileData: {
    age: { 
      type: Number, 
      min: [13, 'Age must be at least 13'], 
      max: [120, 'Age cannot exceed 120'] 
    },
    height: { 
      type: Number, 
      min: [100, 'Height must be at least 100cm'], 
      max: [300, 'Height cannot exceed 300cm'] 
    },
    weight: { 
      type: Number, 
      min: [30, 'Weight must be at least 30kg'], 
      max: [500, 'Weight cannot exceed 500kg'] 
    },
    gender: { 
      type: String, 
      enum: ['Male', 'Female', 'Other'] 
    },
    activityLevel: { 
      type: String, 
      enum: ['Sedentary', 'Light', 'Moderate', 'Active', 'Very Active'] 
    },
    sleepHours: {
      type: Number,
      min: [0, 'Sleep hours cannot be negative'],
      max: [24, 'Sleep hours cannot exceed 24']
    },
    goal: { 
      type: String, 
      enum: ['Weight Loss', 'Muscle Gain', 'Maintenance', 'General Health', 'Performance'] 
    },
    dietPreference: { 
      type: String, 
      enum: ['None', 'Vegan', 'Vegetarian', 'Keto', 'Paleo', 'Mediterranean'] 
    },
    stressLevel: {
      type: String,
      enum: ['Low', 'Moderate', 'High', 'Severe']
    },
    medicalConditions: {
      type: String,
      default: ''
    },
    workoutExperience: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced']
    }
  },
  gamification: {
    xp: { 
      type: Number, 
      default: 0, 
      min: 0 
    },
    level: { 
      type: Number, 
      default: 1, 
      min: 1 
    },
    currentStreak: { 
      type: Number, 
      default: 0, 
      min: 0 
    },
    highestStreak: { 
      type: Number, 
      default: 0, 
      min: 0 
    }
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  verificationToken: String,
  verificationTokenExpire: Date
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for member since duration
userSchema.virtual('memberSinceMonths').get(function() {
  if (!this.createdAt) return 0;
  const now = new Date();
  const created = this.createdAt;
  return (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
});

module.exports = mongoose.model('User', userSchema);