import mongoose from 'mongoose';

const shoppingItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true },
  category: {
    type: String,
    required: true,
    enum: ['Produce','Meat & Seafood','Dairy & Eggs','Pantry & Dry Goods','Frozen Foods','Other'],
    default: 'Other'
  },
  estimatedPrice: { type: Number, min: 0 },
  isCompleted: { type: Boolean, default: false },
  notes: { type: String, maxlength: 200 }
});

const shoppingListSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  mealPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'MealPlan' },
  items: [shoppingItemSchema],
  totalEstimatedCost: { type: Number, default: 0, min: 0 },
  isCompleted: { type: Boolean, default: false },
  completedAt: Date
}, { timestamps: true });

shoppingListSchema.index({ isCompleted: 1, createdAt: -1 });

shoppingListSchema.methods.calculateTotalCost = function() {
  this.totalEstimatedCost = this.items.reduce((sum, i) => sum + (i.estimatedPrice || 0), 0);
  return this.totalEstimatedCost;
};

export default mongoose.model('ShoppingList', shoppingListSchema);
