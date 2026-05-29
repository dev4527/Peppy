const express = require('express');
const router = express.Router(); // ✅ FIXED: Express Router syntax fixed
const axios = require('axios'); 
const Task = require('../models/Task');
const auth = require('../middleware/authMiddleware');

// @route   POST api/ai/chat
// @desc    Process project insights and technical doubts strictly in professional English using Groq Free Tier
router.post('/chat', auth, async (req, res) => {
  const { message, projectId } = req.body;

  if (!message) {
    return res.status(400).json({ message: 'Message sequence input required.' });
  }

  if (!process.env.GROQ_API_KEY) {
    console.error('❌ CRITICAL: GROQ_API_KEY is missing from system environment maps!');
    return res.status(500).json({ response: "System configuration error: Groq API Key is unassigned on the server node." });
  }

  try {
    let projectContext = "No specific project boundary selected.";

    // DYNAMIC DATABASE SYNC FETCH: PULL WORKSPACE LOGS IF PROJECT IS ACTIVE
    if (projectId) {
      const activeTasks = await Task.find({ project: projectId }).populate('assignedTo', 'name role');
      
      const structuredTasks = activeTasks.map(t => ({
        title: t.title,
        description: t.description || 'No instruction guidelines context declared.',
        status: t.status,
        priority: t.priority,
        assignee: t.assignedTo ? t.assignedTo.name : 'Unassigned Pool',
        cadence: t.recurrenceType
      }));

      projectContext = `
        You are an elite AI Operations Project Manager inside the "Peppy Tracker" secure corporate grid.
        Here is the current real-time database schema state metrics of the selected active project:
        ${JSON.stringify(structuredTasks, null, 2)}
      `;
    }

    const systemPrompt = `
      ${projectContext}
      
      Strict Directives Engine:
      1. LANGUAGE REQUIREMENT: You must respond STRICTLY in clear, grammatically flawless, and professional English. Even if the user asks a question in Hinglish, Hindi, or conversational code slang, translate the context mentally and formulate the final output entirely in English. Do not mix Hindi words, Hinglish terms, or colloquial chat slang under any circumstances.
      2. If the user query addresses specific project audits, tasks, or workload pipelines, process the contextual database JSON snapshot attached above to give precise telemetry analytics and summaries.
      3. If the user query is a general doubt, code architecture strategy, technical error parsing, or a startup deployment doubt, switch to Universal Tech Mentor Mode and resolve it intelligently, completely, and concisely.
      4. Keep the output clean, highly structured with standard Markdown bullet points where applicable, and actionable. Avoid unnecessary boilerplate prefaces or AI self-referential introductory chatter.
    `;

    // GROQ REST ENDPOINT COMPILATION
    const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
    
    const response = await axios.post(
      groqUrl,
      {
        model: 'llama-3.1-8b-instant', 
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.3
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Extract content safely from standard ChatCompletion response body
    if (response.data && response.data.choices && response.data.choices[0].message.content) {
      const aiResponse = response.data.choices[0].message.content;
      return res.json({ response: aiResponse });
    } else {
      throw new Error("Unable to parse choices stream block from Groq server response mapping.");
    }

  } catch (error) {
    console.error('❌ Groq Engine Cluster Matrix Breach:', error.response?.data || error.message);
    const cleanErrorMessage = error.response?.data?.error?.message || error.message;
    return res.status(500).json({ response: "AI engine cloud access timeout: " + cleanErrorMessage });
  }
});

module.exports = router;