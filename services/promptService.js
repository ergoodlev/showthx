/**
 * AI Prompt Service for GratituGram
 * Provides personalized prompts with {name} and {gift} placeholders
 */

const PROMPT_TEMPLATES = [
  'Thank {name} for the {gift} by showing how much it means to you!',
  'Tell {name} why the {gift} is so special and how you will use it',
  'Show {name} your excitement about the {gift} and describe what makes it awesome',
  'Express how grateful you are to {name} for the thoughtful {gift}',
  'Demonstrate the {gift} and explain to {name} why it\'s your favorite!',
  'Create a special moment with {name} about the {gift} and your appreciation',
  'Tell {name} about all the fun things you can do with your new {gift}',
  'Show {name} how the {gift} has made your day even better',
  'Explain to {name} what makes this {gift} the perfect choice for you',
  'Thank {name} for being so thoughtful with the {gift} - show your true joy!',
];

/**
 * Generate a personalized prompt
 * @param {string} guestName - Name of the gift giver
 * @param {string} giftName - Name of the gift
 * @returns {string} - Personalized prompt
 */
export function generatePrompt(guestName, giftName) {
  if (!guestName || !giftName) {
    return 'Record a heartfelt thank you message!';
  }

  const randomTemplate = PROMPT_TEMPLATES[
    Math.floor(Math.random() * PROMPT_TEMPLATES.length)
  ];

  return randomTemplate
    .replace('{name}', guestName)
    .replace('{gift}', giftName);
}

/**
 * Get a new random prompt
 * @param {string} guestName
 * @param {string} giftName
 * @returns {string} - New prompt
 */
export function refreshPrompt(guestName, giftName) {
  return generatePrompt(guestName, giftName);
}

/**
 * Get all available prompt templates
 * @returns {array} - Array of prompt templates
 */
export function getAllPrompts() {
  return PROMPT_TEMPLATES;
}
