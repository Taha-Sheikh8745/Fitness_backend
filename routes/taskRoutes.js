const express = require('express');
const router = express.Router();
const { getTasks, createTask, toggleTaskLimit, deleteTask } = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(getTasks)
    .post(createTask);

router.route('/:id')
    .patch(toggleTaskLimit)
    .delete(deleteTask);

module.exports = router;
