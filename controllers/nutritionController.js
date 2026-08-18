const Nutrition = require('../models/Nutrition');
const { createNotification } = require('../utils/notificationHelper');

// @desc    Get user nutrition with aggregated macros
// @route   GET /api/nutrition
// @access  Private
const getNutrition = async (req, res) => {
  try {
    const { search, mealType, startDate, endDate } = req.query;
    const filter = { user: req.user._id };

    if (search) {
      filter.foodName = { $regex: search, $options: 'i' };
    }
    if (mealType) {
      filter.mealType = mealType;
    }

    if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.date.$lte = end;
        }
    }

    const nutritionLogs = await Nutrition.find(filter).sort({ date: -1 });

    let stats = {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFats: 0
    };

    nutritionLogs.forEach(log => {
        stats.totalCalories += (log.calories || 0);
        stats.totalProtein += (log.protein || 0);
        stats.totalCarbs += (log.carbs || 0);
        stats.totalFats += (log.fats || 0);
    });

    res.status(200).json({ success: true, data: nutritionLogs, stats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Add nutrition
// @route   POST /api/nutrition
// @access  Private
const addNutrition = async (req, res) => {
  try {
    const { mealType, foodName, calories, protein, carbs, fats, date } = req.body;

    const nutrition = await Nutrition.create({
      user: req.user._id,
      mealType,
      foodName,
      calories,
      protein,
      carbs,
      fats,
      date: date ? new Date(date) : Date.now(),
    });

    await createNotification(
      req.user._id,
      `You logged a new nutrition item: ${foodName} (${calories} kcal)`,
      'Nutrition'
    );

    res.status(201).json({ success: true, data: nutrition });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update nutrition
// @route   PUT /api/nutrition/:id
// @access  Private
const updateNutrition = async (req, res) => {
  try {
    let nutrition = await Nutrition.findById(req.params.id);

    if (!nutrition) {
      return res.status(404).json({ success: false, message: 'Nutrition not found' });
    }

    if (nutrition.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    nutrition = await Nutrition.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: nutrition });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Delete nutrition
// @route   DELETE /api/nutrition/:id
// @access  Private
const deleteNutrition = async (req, res) => {
  try {
    const nutrition = await Nutrition.findById(req.params.id);

    if (!nutrition) {
      return res.status(404).json({ success: false, message: 'Nutrition not found' });
    }

    if (nutrition.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    await nutrition.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = {
  getNutrition,
  addNutrition,
  updateNutrition,
  deleteNutrition,
};
