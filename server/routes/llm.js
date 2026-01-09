const express = require('express');
const router = express.Router();
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const LLMService = require('../services/llmService');
const User = require('../models/User');
const CryptoJS = require('crypto-js');

const auth = passport.authenticate('jwt', { session: false });

// Encrypt API key
const encryptApiKey = (apiKey) => {
  return CryptoJS.AES.encrypt(apiKey, process.env.ENCRYPTION_KEY).toString();
};

// Decrypt API key
const decryptApiKey = (encryptedKey) => {
  const bytes = CryptoJS.AES.decrypt(encryptedKey, process.env.ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Get LLM configuration status
router.get('/config', auth, async (req, res) => {
  try {
    res.json({
      provider: req.user.llmProvider,
      configured: !!(req.user.llmProvider && req.user.llmApiKey)
    });
  } catch (error) {
    console.error('Get LLM config error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch LLM configuration' } });
  }
});

// Set LLM configuration
router.post('/config',
  auth,
  [
    body('provider').isIn(['openai', 'deepseek']),
    body('apiKey').trim().notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { provider, apiKey } = req.body;

      // Test the API key
      const llmService = new LLMService(provider, apiKey);
      const isValid = await llmService.testConnection();

      if (!isValid) {
        return res.status(400).json({ error: { message: 'Invalid API key or connection failed' } });
      }

      // Save encrypted API key
      req.user.llmProvider = provider;
      req.user.llmApiKey = encryptApiKey(apiKey);
      await req.user.save();

      res.json({
        message: 'LLM configuration saved successfully',
        provider
      });
    } catch (error) {
      console.error('Set LLM config error:', error);
      res.status(500).json({ error: { message: 'Failed to save LLM configuration' } });
    }
  }
);

// Remove LLM configuration
router.delete('/config', auth, async (req, res) => {
  try {
    req.user.llmProvider = null;
    req.user.llmApiKey = null;
    await req.user.save();

    res.json({ message: 'LLM configuration removed successfully' });
  } catch (error) {
    console.error('Remove LLM config error:', error);
    res.status(500).json({ error: { message: 'Failed to remove LLM configuration' } });
  }
});

// Parse natural language input
router.post('/parse',
  auth,
  [
    body('input').trim().notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.user.llmProvider || !req.user.llmApiKey) {
        return res.status(400).json({ error: { message: 'LLM not configured. Please set up your API key in settings.' } });
      }

      const { input, context } = req.body;

      // Decrypt API key
      const apiKey = decryptApiKey(req.user.llmApiKey);
      const llmService = new LLMService(req.user.llmProvider, apiKey);

      // Parse the input
      const result = await llmService.parseTaskInput(input, context);

      res.json(result);
    } catch (error) {
      console.error('Parse input error:', error);
      res.status(500).json({ error: { message: 'Failed to parse input' } });
    }
  }
);

// Continue conversation (for clarifications)
router.post('/chat',
  auth,
  [
    body('message').trim().notEmpty(),
    body('conversationHistory').isArray()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.user.llmProvider || !req.user.llmApiKey) {
        return res.status(400).json({ error: { message: 'LLM not configured' } });
      }

      const { message, conversationHistory } = req.body;

      // Decrypt API key
      const apiKey = decryptApiKey(req.user.llmApiKey);
      const llmService = new LLMService(req.user.llmProvider, apiKey);

      // Continue conversation
      const result = await llmService.continueConversation(message, conversationHistory);

      res.json(result);
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: { message: 'Failed to process chat message' } });
    }
  }
);

// Generate task suggestions
router.post('/suggest',
  auth,
  [
    body('context').trim().notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.user.llmProvider || !req.user.llmApiKey) {
        return res.status(400).json({ error: { message: 'LLM not configured' } });
      }

      const { context } = req.body;

      // Decrypt API key
      const apiKey = decryptApiKey(req.user.llmApiKey);
      const llmService = new LLMService(req.user.llmProvider, apiKey);

      // Generate suggestions
      const suggestions = await llmService.generateSuggestions(context);

      res.json({ suggestions });
    } catch (error) {
      console.error('Generate suggestions error:', error);
      res.status(500).json({ error: { message: 'Failed to generate suggestions' } });
    }
  }
);

module.exports = router;

