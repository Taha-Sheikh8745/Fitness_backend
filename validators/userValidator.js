const { z } = require('zod');

const profileDataSchema = z.object({
  age: z.number().min(10).max(120),
  height: z.number().min(50).max(300),
  weight: z.number().min(20).max(500),
  gender: z.enum(['Male', 'Female', 'Other']),
  activityLevel: z.enum(['Sedentary', 'Light', 'Moderate', 'Active', 'Very Active']),
  goal: z.enum(['Weight Loss', 'Muscle Gain', 'Maintenance']),
  dietPreference: z.enum(['None', 'Vegan', 'Vegetarian', 'Keto', 'Paleo']),
});

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: err.errors
    });
  }
};

module.exports = { profileDataSchema, validate };
