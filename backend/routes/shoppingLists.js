import express from 'express';
import ShoppingList from '../models/ShoppingList.js';
import MealPlan from '../models/MealPlan.js';
import { validateShoppingList } from '../middleware/validation.js';

const router = express.Router();

// List
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, isCompleted } = req.query;
    const filter = {};
    if (isCompleted !== undefined) filter.isCompleted = isCompleted === 'true';
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [data, total] = await Promise.all([
      ShoppingList.find(filter).populate('mealPlan', 'name startDate endDate').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      ShoppingList.countDocuments(filter)
    ]);

    res.json({ success: true, data, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch shopping lists', error: e.message });
  }
});

// Get one
router.get('/:id', async (req, res) => {
  try {
    const list = await ShoppingList.findById(req.params.id).populate('mealPlan', 'name startDate endDate');
    if (!list) return res.status(404).json({ success: false, message: 'Shopping list not found' });
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch shopping list', error: e.message });
  }
});

// Create
router.post('/', validateShoppingList, async (req, res) => {
  try {
    const list = new ShoppingList(req.body);
    list.calculateTotalCost();
    await list.save();
    res.status(201).json({ success: true, message: 'Shopping list created', data: list });
  } catch (e) {
    res.status(400).json({ success: false, message: 'Failed to create shopping list', error: e.message });
  }
});

// Generate from meal plan
router.post('/from-meal-plan/:mealPlanId', async (req, res) => {
  try {
    const { name } = req.body;
    const plan = await MealPlan.findById(req.params.mealPlanId);
    if (!plan) return res.status(404).json({ success: false, message: 'Meal plan not found' });

    const ingredients = await plan.getAllIngredients();
    const items = ingredients.map((ing) => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      category: ing.category,
      estimatedPrice: 0,
      isCompleted: false
    }));

    const list = new ShoppingList({ name: name || `Shopping List - ${plan.name}`, mealPlan: plan._id, items });
    list.calculateTotalCost();
    await list.save();

    res.status(201).json({ success: true, message: 'Shopping list generated', data: list });
  } catch (e) {
    res.status(400).json({ success: false, message: 'Failed to generate shopping list', error: e.message });
  }
});

// Update
router.put('/:id', validateShoppingList, async (req, res) => {
  try {
    const list = await ShoppingList.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!list) return res.status(404).json({ success: false, message: 'Shopping list not found' });
    list.calculateTotalCost();
    await list.save();
    res.json({ success: true, message: 'Shopping list updated', data: list });
  } catch (e) {
    res.status(400).json({ success: false, message: 'Failed to update shopping list', error: e.message });
  }
});

// Toggle item
router.patch('/:id/items/:itemId/toggle', async (req, res) => {
  try {
    const list = await ShoppingList.findById(req.params.id);
    if (!list) return res.status(404).json({ success: false, message: 'Shopping list not found' });

    const item = list.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    item.isCompleted = !item.isCompleted;

    const allDone = list.items.every((x) => x.isCompleted);
    list.isCompleted = allDone;
    list.completedAt = allDone ? new Date() : undefined;

    await list.save();
    res.json({ success: true, message: 'Item updated', data: list });
  } catch (e) {
    res.status(400).json({ success: false, message: 'Failed to toggle item', error: e.message });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  try {
    const list = await ShoppingList.findByIdAndDelete(req.params.id);
    if (!list) return res.status(404).json({ success: false, message: 'Shopping list not found' });
    res.json({ success: true, message: 'Shopping list deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to delete shopping list', error: e.message });
  }
});

export default router;
