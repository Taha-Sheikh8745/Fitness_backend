const express = require('express');
const router = express.Router();
const { getNutrition, addNutrition, updateNutrition, deleteNutrition } = require('../controllers/nutritionController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getNutrition)
  .post(protect, addNutrition);

router.route('/:id')
  .put(protect, updateNutrition)
  .delete(protect, deleteNutrition);

module.exports = router;
