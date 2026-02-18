import {
    readSessionStorage,
    removeSessionStorage,
    writeSessionStorage,
} from './storage';

const RECIPE_EDIT_DIRTY_KEY = 'recipeEditDirty';

export const isRecipeEditDirty = () => readSessionStorage(RECIPE_EDIT_DIRTY_KEY) === '1';

export const markRecipeEditDirty = () => writeSessionStorage(RECIPE_EDIT_DIRTY_KEY, '1');

export const clearRecipeEditDirty = () => removeSessionStorage(RECIPE_EDIT_DIRTY_KEY);
