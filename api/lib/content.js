// lib/content.js
// Content Engine: carga el curriculum desde content/ (JSON) hacia Firestore/File.
// Metadata mínima: {id, title, level, skill, topic, estimatedTime, difficulty, premium, contentType}

const fs = require('fs');
const path = require('path');
const store = require('./store');

const CONTENT_DIR = path.resolve(__dirname, '..', process.env.CONTENT_DIR || '../content');
const DAYS_DIR = path.join(CONTENT_DIR, '21-day-challenge');

function loadFile(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function getChallengeIndex() {
  return loadFile(path.join(DAYS_DIR, 'index.json'));
}

function getDay(dayNumber) {
  const padded = String(dayNumber).padStart(2, '0');
  return loadFile(path.join(DAYS_DIR, `day-${padded}.json`));
}

function getPost21(kind) {
  return loadFile(path.join(CONTENT_DIR, 'post21', `${kind}.json`));
}

function getContinuous(kind) {
  return loadFile(path.join(CONTENT_DIR, 'continuous', `${kind}.json`));
}

async function getDayPublished(dayNumber) {
  const day = getDay(dayNumber);
  if (!day) return null;
  if (day.status !== 'published') return null;
  // en producción se podría servir desde Firestore; en V1 servimos el JSON directo
  return day;
}

module.exports = { CONTENT_DIR, getChallengeIndex, getDay, getDayPublished, getPost21, getContinuous };
