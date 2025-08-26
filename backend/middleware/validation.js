import Joi from 'joi';

const id24 = Joi.string().hex().length(24);

// Reusable sub-schemas
const ingredientSchema = Joi.object({
  name: Joi.string().trim().required(),
  quantity: Joi.number().min(0).required(),
  unit: Joi.string().required(),
  category: Joi.string().valid(
    'Produce',
    'Meat & Seafood',
    'Dairy & Eggs',
    'Pantry & Dry Goods',
    'Frozen Foods',
    'Other'
  ).default('Other')
});

const instructionSchema = Joi.object({
  step: Joi.number().integer().min(1).required(),
  description: Joi.string().max(500).required()
});

// Recipes: arrays are validated because routes normalize multipart fields to arrays
const recipeSchema = Joi.object({
  name: Joi.string().trim().max(100).required(),
  description: Joi.string().max(500).allow(''),
  cuisine: Joi.string().valid(
    'Italian','Asian','Mexican','American','Indian','Mediterranean','Thai','French','Chinese','Other'
  ).required(),
  prepTime: Joi.number().integer().min(0).max(480).required(),
  cookTime: Joi.number().integer().min(0).max(480).required(),
  servings: Joi.number().integer().min(1).max(20).required(),
  difficulty: Joi.number().integer().valid(1,2,3).required(),

  // Important: these are arrays now (the routes convert JSON strings → arrays before validation)
  ingredients: Joi.array().items(ingredientSchema).required(),
  instructions: Joi.array().items(instructionSchema).required(),
  tags: Joi.array().items(Joi.string().trim()).default([]),
  image: Joi.any(),

  rating: Joi.number().min(1).max(5).optional(),
  notes: Joi.string().max(1000).allow('')
});

// Meal plans
const mealSlotSchema = Joi.object({
  recipe: id24.required(),
  servings: Joi.number().integer().min(1).max(20).required(),
  notes: Joi.string().max(200).allow('')
});

const mealPlanSchema = Joi.object({
  name: Joi.string().trim().max(100).required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().min(Joi.ref('startDate')).required(),
  days: Joi.array().items(Joi.object({
    date: Joi.date().required(),
    breakfast: Joi.array().items(mealSlotSchema).default([]),
    lunch: Joi.array().items(mealSlotSchema).default([]),
    dinner: Joi.array().items(mealSlotSchema).default([]),
    snacks: Joi.array().items(mealSlotSchema).default([])
  })).optional(),
  isActive: Joi.boolean().optional()
});

// Shopping lists
const shoppingItemSchema = Joi.object({
  name: Joi.string().trim().required(),
  quantity: Joi.number().min(0).required(),
  unit: Joi.string().required(),
  category: Joi.string().valid(
    'Produce','Meat & Seafood','Dairy & Eggs','Pantry & Dry Goods','Frozen Foods','Other'
  ).required(),
  estimatedPrice: Joi.number().min(0).optional(),
  isCompleted: Joi.boolean().optional(),
  notes: Joi.string().max(200).allow('')
});

const shoppingListSchema = Joi.object({
  name: Joi.string().trim().max(100).required(),
  mealPlan: id24.optional(),
  items: Joi.array().items(shoppingItemSchema).optional(),
  isCompleted: Joi.boolean().optional()
});

// Middleware helpers
export const validateRecipe = (req, res, next) => {
  const { error, value } = recipeSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(d => d.message)
    });
  }
  req.body = value;
  next();
};

export const validateMealPlan = (req, res, next) => {
  const { error, value } = mealPlanSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(d => d.message)
    });
  }
  req.body = value;
  next();
};

export const validateShoppingList = (req, res, next) => {
  const { error, value } = shoppingListSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(d => d.message)
    });
  }
  req.body = value;
  next();
};
