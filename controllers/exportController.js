const Workout = require('../models/Workout');
const Nutrition = require('../models/Nutrition');
const PDFDocument = require('pdfkit');

// @desc    Export data to PDF
// @route   GET /api/export/pdf
// @access  Private
const exportToPDF = async (req, res) => {
  try {
    const workouts = await Workout.find({ user: req.user._id }).sort({ date: -1 });
    const nutrition = await Nutrition.find({ user: req.user._id }).sort({ date: -1 });

    const doc = new PDFDocument();

    let filename = `FitForge_Report_export.pdf`;
    filename = encodeURIComponent(filename);

    res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    doc.fontSize(25).text('FitForge AI - Fitness Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(18).text(`User: ${req.user.name}`);
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    doc.fontSize(16).text('Recent Workouts', { underline: true });
    doc.moveDown();

    workouts.slice(0, 10).forEach((w, i) => {
      doc.fontSize(12).text(`${i + 1}. ${w.date.toLocaleDateString()} - ${w.exerciseName}: ${w.sets} sets, ${w.reps} reps, ${w.weight} weight (${w.category})`);
    });

    doc.moveDown();
    doc.fontSize(16).text('Recent Nutrition Logs', { underline: true });
    doc.moveDown();

    nutrition.slice(0, 10).forEach((n, i) => {
      doc.fontSize(12).text(`${i + 1}. ${n.date.toLocaleDateString()} - ${n.mealType}: ${n.foodName} | ${n.calories} kcal, P:${n.protein}g, C:${n.carbs}g, F:${n.fats}g`);
    });

    doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Export data to CSV
// @route   GET /api/export/csv
// @access  Private
const exportToCSV = async (req, res) => {
  try {
    const workouts = await Workout.find({ user: req.user._id }).sort({ date: -1 });
    const nutrition = await Nutrition.find({ user: req.user._id }).sort({ date: -1 });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="FitForge_Report_export.csv"');

    let csvContent = "--- WORKOUTS ---\n";
    csvContent += "Date,Exercise,Sets,Reps,Weight,Category,Tags,Notes\n";
    workouts.forEach(w => {
      csvContent += `${new Date(w.date).toLocaleDateString()},"${w.exerciseName}",${w.sets},${w.reps},${w.weight},"${w.category}","${(w.tags||[]).join(',')}","${w.notes||''}"\n`;
    });

    csvContent += "\n--- NUTRITION ---\n";
    csvContent += "Date,Meal Type,Food Name,Calories,Protein(g),Carbs(g),Fats(g)\n";
    nutrition.forEach(n => {
      csvContent += `${new Date(n.date).toLocaleDateString()},"${n.mealType}","${n.foodName}",${n.calories},${n.protein},${n.carbs},${n.fats}\n`;
    });

    res.status(200).send(csvContent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = {
  exportToPDF,
  exportToCSV
};
