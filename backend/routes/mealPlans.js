import express from 'express';
import MealPlan from '../models/MealPlan.js';
import Recipe from '../models/Recipe.js';
import { validateMealPlan } from '../middleware/validation.js';

const router = express.Router();

// List
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [data, total] = await Promise.all([
      MealPlan.find(filter)
        .populate('days.breakfast.recipe days.lunch.recipe days.dinner.recipe days.snacks.recipe')
        .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      MealPlan.countDocuments(filter)
    ]);

    res.json({ success: true, data, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch meal plans', error: e.message });
  }
});

// Current week (auto-create)
router.get('/current', async (_req, res) => {
  try {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0,0,0,0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23,59,59,999);

    let plan = await MealPlan.findOne({ startDate: { $lte: end }, endDate: { $gte: start }, isActive: true })
      .populate('days.breakfast.recipe days.lunch.recipe days.dinner.recipe days.snacks.recipe');

    if (!plan) {
      const days = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        days.push({ date, breakfast: [], lunch: [], dinner: [], snacks: [] });
      }
      plan = await MealPlan.create({ name: `Week of ${start.toLocaleDateString()}`, startDate: start, endDate: end, days });
    }

    res.json({ success: true, data: plan });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch current meal plan', error: e.message });
  }
});

// Get one
router.get('/:id', async (req, res) => {
  try {
    const plan = await MealPlan.findById(req.params.id)
      .populate('days.breakfast.recipe days.lunch.recipe days.dinner.recipe days.snacks.recipe');
    if (!plan) return res.status(404).json({ success: false, message: 'Meal plan not found' });
    res.json({ success: true, data: plan });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch meal plan', error: e.message });
  }
});

// Create
router.post('/', validateMealPlan, async (req, res) => {
  try {
    const plan = await MealPlan.create(req.body);
    res.status(201).json({ success: true, message: 'Meal plan created', data: plan });
  } catch (e) {
    res.status(400).json({ success: false, message: 'Failed to create meal plan', error: e.message });
  }
});

// Update
router.put('/:id', validateMealPlan, async (req, res) => {
  try {
    const plan = await MealPlan.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('days.breakfast.recipe days.lunch.recipe days.dinner.recipe days.snacks.recipe');
    if (!plan) return res.status(404).json({ success: false, message: 'Meal plan not found' });
    res.json({ success: true, message: 'Meal plan updated', data: plan });
  } catch (e) {
    res.status(400).json({ success: false, message: 'Failed to update meal plan', error: e.message });
  }
});

// Add meal
router.post('/:id/add-meal', async (req, res) => {
  try {
    const { date, mealType, recipeId, servings = 1, notes } = req.body;
    if (!date || !mealType || !recipeId) return res.status(400).json({ success: false, message: 'date, mealType, recipeId required' });

    const recipe = await Recipe.findById(recipeId);
    if (!recipe) return res.status(404).json({ success: false, message: 'Recipe not found' });

    const plan = await MealPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Meal plan not found' });

    const d = new Date(date);
    const idx = plan.days.findIndex((x) => x.date.toDateString() === d.toDateString());
    if (idx === -1) return res.status(400).json({ success: false, message: 'Date not in plan' });

    plan.days[idx][mealType].push({ recipe: recipeId, servings: parseInt(servings), notes });
    await plan.save();
    await plan.populate('days.breakfast.recipe days.lunch.recipe days.dinner.recipe days.snacks.recipe');

    res.json({ success: true, message: 'Meal added', data: plan });
  } catch (e) {
    res.status(400).json({ success: false, message: 'Failed to add meal', error: e.message });
  }
});

// Remove meal
router.delete('/:id/remove-meal', async (req, res) => {
  try {
    const { date, mealType, mealIndex } = req.body;
    const plan = await MealPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Meal plan not found' });

    const d = new Date(date);
    const idx = plan.days.findIndex((x) => x.date.toDateString() === d.toDateString());
    if (idx === -1) return res.status(400).json({ success: false, message: 'Date not in plan' });

    plan.days[idx][mealType].splice(mealIndex, 1);
    await plan.save();
    await plan.populate('days.breakfast.recipe days.lunch.recipe days.dinner.recipe days.snacks.recipe');

    res.json({ success: true, message: 'Meal removed', data: plan });
  } catch (e) {
    res.status(400).json({ success: false, message: 'Failed to remove meal', error: e.message });
  }
});

// Ingredients
router.get('/:id/ingredients', async (req, res) => {
  try {
    const plan = await MealPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Meal plan not found' });
    const ingredients = await plan.getAllIngredients();
    res.json({ success: true, data: ingredients });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to get ingredients', error: e.message });
  }
});

export default router;
