import mongoose from 'mongoose';

const mealSlotSchema = new mongoose.Schema({
  recipe: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', required: true },
  servings: { type: Number, required: true, min: 1, max: 20, default: 1 },
  notes: { type: String, maxlength: 200 }
}, { _id: false });

const dayPlanSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  breakfast: [mealSlotSchema],
  lunch: [mealSlotSchema],
  dinner: [mealSlotSchema],
  snacks: [mealSlotSchema]
}, { _id: false });

const mealPlanSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  days: [dayPlanSchema],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

mealPlanSchema.index({ startDate: 1, endDate: 1, isActive: 1 });

mealPlanSchema.methods.getAllIngredients = async function() {
  await this.populate('days.breakfast.recipe days.lunch.recipe days.dinner.recipe days.snacks.recipe');

  const map = new Map();
  const add = (item, scale) => {
    const key = `${item.name}_${item.unit}`;
    const qty = item.quantity * scale;
    if (map.has(key)) map.get(key).quantity += qty;
    else map.set(key, { name: item.name, quantity: qty, unit: item.unit, category: item.category || 'Other' });
  };

  this.days.forEach((d) => {
    ['breakfast','lunch','dinner','snacks'].forEach((slot) => {
      d[slot].forEach((m) => {
        if (m.recipe?.ingredients) {
          const factor = m.servings / m.recipe.servings;
          m.recipe.ingredients.forEach((ing) => add(ing, factor));
        }
      });
    });
  });

  return Array.from(map.values()).map((x) => ({ ...x, quantity: Math.round(x.quantity * 100) / 100 }));
};

export default mongoose.model('MealPlan', mealPlanSchema);
