#!/usr/bin/env node

/**
 * Model Consistency Verification Script
 * 
 * Verifies that hardcoded fallback models in the chat route match
 * the default models defined in the seed data.
 */

const fs = require('fs');
const path = require('path');

function extractSeedModels() {
  const seedPath = path.join(__dirname, '../sql/seed.sql');
  const seedContent = fs.readFileSync(seedPath, 'utf8');
  
  const models = {};
  
  // Extract OpenAI model
  const openaiMatch = seedContent.match(/INSERT INTO ai_model_config[\s\S]*?VALUES \(\s*'openai',\s*'([^']+)',\s*TRUE[\s\S]*?(\d+(?:\.\d+)?),\s*(\d+),\s*(\d+(?:\.\d+)?)/);
  if (openaiMatch) {
    models.openai = {
      modelName: openaiMatch[1],
      temperature: parseFloat(openaiMatch[2]),
      maxTokens: parseInt(openaiMatch[3]),
      topP: parseFloat(openaiMatch[4])
    };
  }
  
  // Extract Google model
  const googleMatch = seedContent.match(/INSERT INTO ai_model_config[\s\S]*?VALUES \(\s*'google',\s*'([^']+)',\s*TRUE[\s\S]*?(\d+(?:\.\d+)?),\s*(\d+),\s*(\d+(?:\.\d+)?)/);
  if (googleMatch) {
    models.google = {
      modelName: googleMatch[1],
      temperature: parseFloat(googleMatch[2]),
      maxTokens: parseInt(googleMatch[3]),
      topP: parseFloat(googleMatch[4])
    };
  }
  
  return models;
}

function extractChatRouteModels() {
  const chatRoutePath = path.join(__dirname, '../src/app/api/chat/route.ts');
  const chatContent = fs.readFileSync(chatRoutePath, 'utf8');
  
  const models = {};
  
  // Extract Google fallback
  const googleMatch = chatContent.match(/provider === "google"[\s\S]*?modelName: "([^"]+)",[\s\S]*?temperature: ([^,]+),[\s\S]*?maxTokens: ([^,]+),[\s\S]*?topP: ([^,\s]+)/);
  if (googleMatch) {
    models.google = {
      modelName: googleMatch[1],
      temperature: parseFloat(googleMatch[2]),
      maxTokens: parseInt(googleMatch[3]),
      topP: parseFloat(googleMatch[4])
    };
  }
  
  // Extract OpenAI fallback (else block)
  const openaiMatch = chatContent.match(/} else \{[\s\S]*?modelName: "([^"]+)",[\s\S]*?temperature: ([^,]+),[\s\S]*?maxTokens: ([^,]+),[\s\S]*?topP: ([^,\s]+)/);
  if (openaiMatch) {
    models.openai = {
      modelName: openaiMatch[1],
      temperature: parseFloat(openaiMatch[2]),
      maxTokens: parseInt(openaiMatch[3]),
      topP: parseFloat(openaiMatch[4])
    };
  }
  
  return models;
}

function compareModels(seedModels, chatModels) {
  console.log('🔍 Model Consistency Verification');
  console.log('================================\n');
  
  let allMatch = true;
  
  for (const provider of ['openai', 'google']) {
    console.log(`📋 ${provider.toUpperCase()} Provider:`);
    
    if (!seedModels[provider] || !chatModels[provider]) {
      console.log(`❌ Missing model configuration for ${provider}`);
      allMatch = false;
      continue;
    }
    
    const seed = seedModels[provider];
    const chat = chatModels[provider];
    
    // Check each property
    const properties = ['modelName', 'temperature', 'maxTokens', 'topP'];
    let providerMatch = true;
    
    for (const prop of properties) {
      if (seed[prop] !== chat[prop]) {
        console.log(`❌ ${prop}: seed=${seed[prop]}, chat=${chat[prop]}`);
        providerMatch = false;
        allMatch = false;
      } else {
        console.log(`✅ ${prop}: ${seed[prop]}`);
      }
    }
    
    if (providerMatch) {
      console.log(`✅ ${provider.toUpperCase()} models are consistent\n`);
    } else {
      console.log(`❌ ${provider.toUpperCase()} models are inconsistent\n`);
    }
  }
  
  console.log('================================');
  if (allMatch) {
    console.log('🎉 All models are consistent between seed data and chat route fallbacks!');
    process.exit(0);
  } else {
    console.log('⚠️  Model inconsistencies found. Please update either seed.sql or chat route.');
    process.exit(1);
  }
}

function main() {
  try {
    const seedModels = extractSeedModels();
    const chatModels = extractChatRouteModels();
    
    console.log('Seed Models:', JSON.stringify(seedModels, null, 2));
    console.log('Chat Models:', JSON.stringify(chatModels, null, 2));
    console.log('');
    
    compareModels(seedModels, chatModels);
  } catch (error) {
    console.error('❌ Error verifying model consistency:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { extractSeedModels, extractChatRouteModels, compareModels };