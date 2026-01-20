import { describe, it, expect } from 'vitest';
import { generateQuestion, generateTest, calculateResults, QUESTION_TYPES } from '../utils/testGenerator';

const mockRecords = [
  {
    id: '1',
    name: 'Стеноз аорты',
    description: 'Систолический шум',
    category: 'cardiac',
    position: '2 межреберье справа',
    audioUrl: 'url1.mp3'
  },
  {
    id: '2',
    name: 'Крепитация',
    description: 'Мелкопузырчатые хрипы',
    category: 'pulmonary',
    position: 'Базальные отделы',
    audioUrl: 'url2.mp3'
  },
  {
    id: '3',
    name: 'Стеноз митрального клапана',
    description: 'Диастолический шум',
    category: 'cardiac',
    position: 'Верхушка сердца',
    audioUrl: 'url3.mp3'
  },
  {
    id: '4',
    name: 'Полифонические хрипы',
    description: 'Свистящие хрипы',
    category: 'pulmonary',
    position: 'Над всей поверхностью',
    audioUrl: 'url4.mp3'
  }
];

describe('Test Generator', () => {
  describe('generateQuestion', () => {
    it('should return null if less than 3 records', () => {
      const result = generateQuestion([mockRecords[0], mockRecords[1]]);
      expect(result).toBeNull();
    });

    it('should generate IDENTIFY_SOUND question', () => {
      const result = generateQuestion(mockRecords, QUESTION_TYPES.IDENTIFY_SOUND);
      
      expect(result).toBeDefined();
      expect(result.type).toBe(QUESTION_TYPES.IDENTIFY_SOUND);
      expect(result.question).toBe('Какой звук вы слышите?');
      expect(result.answers).toHaveLength(4);
      expect(result.audioUrl).toBeDefined();
    });

    it('should generate IDENTIFY_POSITION question', () => {
      const result = generateQuestion(mockRecords, QUESTION_TYPES.IDENTIFY_POSITION);
      
      expect(result).toBeDefined();
      expect(result.type).toBe(QUESTION_TYPES.IDENTIFY_POSITION);
      expect(result.answers).toHaveLength(4);
    });

    it('should generate IDENTIFY_CATEGORY question', () => {
      const result = generateQuestion(mockRecords, QUESTION_TYPES.IDENTIFY_CATEGORY);
      
      expect(result).toBeDefined();
      expect(result.type).toBe(QUESTION_TYPES.IDENTIFY_CATEGORY);
      expect(result.answers).toHaveLength(2);
    });

    it('should have exactly one correct answer', () => {
      const result = generateQuestion(mockRecords);
      const correctAnswers = result.answers.filter(a => a.isCorrect);
      
      expect(correctAnswers).toHaveLength(1);
    });
  });

  describe('generateTest', () => {
    it('should generate specified number of questions', () => {
      const test = generateTest(mockRecords, 3);
      
      expect(test).toHaveLength(3);
    });

    it('should not exceed available records', () => {
      const test = generateTest(mockRecords, 10);
      
      expect(test.length).toBeLessThanOrEqual(mockRecords.length);
    });

    it('should not reuse the same record', () => {
      const test = generateTest(mockRecords, 3);
      const usedIds = test.map(q => q.correctAnswerId);
      const uniqueIds = new Set(usedIds);
      
      expect(uniqueIds.size).toBe(usedIds.length);
    });
  });

  describe('calculateResults', () => {
    const questions = [
      { correctAnswerId: '1' },
      { correctAnswerId: '2' },
      { correctAnswerId: '3' },
      { correctAnswerId: '4' }
    ];

    it('should calculate perfect score', () => {
      const answers = { 0: '1', 1: '2', 2: '3', 3: '4' };
      const results = calculateResults(questions, answers);
      
      expect(results.score).toBe(100);
      expect(results.correct).toBe(4);
      expect(results.wrong).toBe(0);
      expect(results.passed).toBe(true);
    });

    it('should calculate failing score', () => {
      const answers = { 0: 'wrong', 1: 'wrong', 2: '3', 3: '4' };
      const results = calculateResults(questions, answers);
      
      expect(results.score).toBe(50);
      expect(results.correct).toBe(2);
      expect(results.wrong).toBe(2);
      expect(results.passed).toBe(false);
    });

    it('should count unanswered questions', () => {
      const answers = { 0: '1', 2: '3' };
      const results = calculateResults(questions, answers);
      
      expect(results.unanswered).toBe(2);
      expect(results.correct).toBe(2);
    });

    it('should mark as passed with 70% or higher', () => {
      const answers = { 0: '1', 1: '2', 2: '3', 3: 'wrong' };
      const results = calculateResults(questions, answers);
      
      expect(results.score).toBe(75);
      expect(results.passed).toBe(true);
    });
  });
});
