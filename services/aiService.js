const { GoogleGenAI } = require('@google/genai');

/**
 * Service to handle AI generation using Google Gemini (new @google/genai SDK).
 */
class AIService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      console.error('CRITICAL: GEMINI_API_KEY is missing or not configured in .env');
      this.ai = null;
    } else {
      this.ai = new GoogleGenAI({ apiKey });
      this.modelName = 'gemini-2.0-flash';
      console.log('✅ Gemini AI Service initialized with model:', this.modelName);
    }
  }

  /**
   * Generates a comprehensive full fitness + nutrition plan.
   * @param {Object} userData - User's profileData from the DB
   * @param {Object|null} progressData - Latest progress log (weight, bodyFatPercentage, measurements)
   */
  async generateFullPlan(userData, progressData = null) {
    if (!userData) {
      throw new Error('User profile data is required to generate an AI plan.');
    }

    // Build measurements context from progress data if available
    let measurementsContext = '';
    if (progressData) {
      const m = progressData.measurements || {};
      const hasMeasurements = Object.values(m).some(v => v != null && v !== undefined);
      
      measurementsContext = `
LATEST PROGRESS DATA (use this to personalize the plan):
- Tracked Weight: ${progressData.weight || userData.weight}kg
- Body Fat %: ${progressData.bodyFatPercentage != null ? progressData.bodyFatPercentage + '%' : 'Not tracked'}
${hasMeasurements ? `- Body Measurements (cm): Chest: ${m.chest || 'N/A'}, Waist: ${m.waist || 'N/A'}, Arms: ${m.arms || 'N/A'}, Legs: ${m.legs || 'N/A'}, Shoulders: ${m.shoulders || 'N/A'}, Biceps: ${m.biceps || 'N/A'}` : ''}`;
    }

    const prompt = `You are an expert fitness coach and nutritionist. Generate a highly personalized fitness and nutrition plan for this user.

USER PROFILE:
- Goal: ${userData.goal}
- Activity Level: ${userData.activityLevel}
- Diet Preference: ${userData.dietPreference}
- Age: ${userData.age} years
- Weight: ${userData.weight}kg
- Height: ${userData.height}cm
- Gender: ${userData.gender || 'Not specified'}
- Sleep: ${userData.sleepHours} hours/night
- Stress Level: ${userData.stressLevel}
- Workout Experience: ${userData.workoutExperience}
- Medical Conditions: ${userData.medicalConditions || 'None'}
${measurementsContext}

IMPORTANT: Return ONLY valid JSON, no markdown, no extra text. Use exactly this structure:
{
  "workout": {
    "weeklyStructure": [
      "Day 1: [specific workout description]",
      "Day 2: [specific workout description]",
      "Day 3: [specific workout description]",
      "Day 4: [specific workout description]",
      "Day 5: [specific workout description]",
      "Day 6: [specific workout description]",
      "Day 7: [specific workout description]"
    ],
    "keyExercises": ["Exercise 1", "Exercise 2", "Exercise 3", "Exercise 4", "Exercise 5"]
  },
  "nutrition": {
    "breakfast": "Detailed breakfast recommendation with portions",
    "lunch": "Detailed lunch recommendation with portions",
    "dinner": "Detailed dinner recommendation with portions",
    "snacks": ["Snack option 1", "Snack option 2", "Snack option 3"]
  },
  "habits": [
    {"name": "Habit name", "target": "Specific target", "reason": "Why this habit helps their goal"},
    {"name": "Habit name", "target": "Specific target", "reason": "Why this habit helps their goal"},
    {"name": "Habit name", "target": "Specific target", "reason": "Why this habit helps their goal"}
  ],
  "wellness": {
    "waterTarget": "X liters or ml per day",
    "sleepTarget": "X-Y hours",
    "productivityTip": "Specific actionable tip for their goal"
  }
}`;

    return this._safeGenerate(prompt);
  }

  /**
   * Generates personalized goal recommendations (ELITE only).
   * @param {Object} userData - User's profileData
   * @param {Object|null} progressData - Latest progress data
   */
  async generateGoalRecommendation(userData, progressData = null) {
    const progressContext = progressData
      ? `Current tracked weight: ${progressData.weight}kg, Body fat: ${progressData.bodyFatPercentage || 'N/A'}%.`
      : '';

    const prompt = `You are an expert fitness coach. Recommend 3 specific, measurable fitness goals for this person.

User: Age ${userData.age}, Weight ${userData.weight}kg, Height ${userData.height}cm, Goal: ${userData.goal}, Experience: ${userData.workoutExperience}. ${progressContext}

Return ONLY valid JSON, no markdown:
{
  "goals": [
    {"title": "Goal title", "description": "Specific description", "timeframe": "X weeks/months", "metric": "How to measure success"},
    {"title": "Goal title", "description": "Specific description", "timeframe": "X weeks/months", "metric": "How to measure success"},
    {"title": "Goal title", "description": "Specific description", "timeframe": "X weeks/months", "metric": "How to measure success"}
  ]
}`;

    return this._safeGenerate(prompt);
  }

  /**
   * Internal helper for safe generation with timeout and format cleaning.
   */
  async _safeGenerate(prompt) {
    if (!this.ai) {
      throw new Error('AI Strategic Coach is offline. GEMINI_API_KEY is not configured.');
    }

    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI request timed out after 30 seconds')), 30000)
      );

      const generation = this.ai.models.generateContent({
        model: this.modelName,
        contents: prompt
      });

      const result = await Promise.race([generation, timeout]);

      // Extract text from the new SDK response format
      const text = result.text || (result.candidates?.[0]?.content?.parts?.[0]?.text) || '';
      
      if (!text || text.trim() === '') {
        throw new Error('AI returned an empty response.');
      }

      // Clean markdown fences if Gemini wraps in them
      const cleanedText = text
        .replace(/^```json\s*/gi, '')
        .replace(/^```\s*/gi, '')
        .replace(/```\s*$/gi, '')
        .trim();

      const parsed = JSON.parse(cleanedText);
      console.log('✅ AI plan generated successfully');
      return parsed;

    } catch (error) {
      console.error('❌ AI Service Error:', error.message);

      if (error.message.includes('timeout')) {
        throw new Error('AI request timed out. Please try again.');
      }
      if (error instanceof SyntaxError) {
        console.error('❌ AI returned invalid JSON, returning error object');
        throw new Error('AI returned an invalid response format. Please try again.');
      }
      throw error;
    }
  }
}

module.exports = new AIService();
