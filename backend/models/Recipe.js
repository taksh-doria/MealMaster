import mongoose from 'mongoose';

const ingredientSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true, enum: [/* units list */] },
  category: {
    type: String,
    enum: ['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Pantry & Dry Goods', 'Frozen Foods', 'Other'],
    default: 'Other'
  }
}, { _id: false });

const instructionSchema = new mongoose.Schema({
  step: { type: Number, required: true },
  description: { type: String, required: true, maxlength: 500 }
}, { _id: false });

const imageSchema = new mongoose.Schema({
  data: String,          // binary image data stored inline
  contentType: String,   // e.g., image/webp or image/jpeg
  filename: String       // optional file name for reference
}, { _id: false });

const recipeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, maxlength: 500 },
  cuisine: {
    type: String,
    required: true,
    enum: ['Italian','Asian','Mexican','American','Indian','Mediterranean','Thai','French','Chinese','Other']
  },
  prepTime: { type: Number, required: true, min: 0, max: 480 },
  cookTime: { type: Number, required: true, min: 0, max: 480 },
  servings: { type: Number, required: true, min: 1, max: 20 },
  difficulty: { type: Number, required: true, min: 1, max: 3 },
  ingredients: [ingredientSchema],
  instructions: [instructionSchema],
  image: imageSchema,     // INLINE binary image instead of filesystem metadata
  tags: [String],
  rating: { type: Number, min: 1, max: 5 },
  notes: { type: String, maxlength: 1000 }
}, { timestamps: true });

recipeSchema.virtual('totalTime').get(function () {
  return this.prepTime + this.cookTime;
});

recipeSchema.methods.scaleIngredients = function (newServings) {
  const scaleFactor = newServings / this.servings;
  return this.ingredients.map((ingredient) => ({
    ...ingredient.toObject(),
    quantity: Math.round(ingredient.quantity * scaleFactor * 100) / 100,
  }));
};

export default mongoose.model('Recipe', recipeSchema);
