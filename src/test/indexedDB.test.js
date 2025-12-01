import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDB, addRecord, getAllRecords, updateRecord, deleteRecord, clearAllRecords } from '../utils/indexedDB';

describe('IndexedDB Utility', () => {
  beforeEach(async () => {
    await initDB();
    await clearAllRecords();
  });

  afterEach(async () => {
    await clearAllRecords();
  });

  it('should add a record', async () => {
    const record = {
      id: 'test1',
      name: 'Test Record',
      description: 'Test',
      category: 'cardiac',
      position: 'Test position',
      audioUrl: 'test.mp3',
      createdAt: new Date().toISOString()
    };

    await addRecord(record);
    const records = await getAllRecords();

    expect(records).toHaveLength(1);
    expect(records[0].id).toBe('test1');
  });

  it('should get all records', async () => {
    const records = [
      { id: '1', name: 'Record 1', category: 'cardiac',position: 'test', audioUrl: 'test1.mp3', createdAt: new Date().toISOString() },
      { id: '2', name: 'Record 2', category: 'pulmonary', position: 'test', audioUrl: 'test2.mp3', createdAt: new Date().toISOString() }
    ];

    for (const record of records) {
      await addRecord(record);
    }

    const retrieved = await getAllRecords();
    expect(retrieved).toHaveLength(2);
  });

  it('should update a record', async () => {
    const record = {
      id: 'test1',
      name: 'Original Name',
      category: 'cardiac',
      position: 'test',
      audioUrl: 'test.mp3',
      createdAt: new Date().toISOString()
    };

    await addRecord(record);
    
    const updated = { ...record, name: 'Updated Name' };
    await updateRecord(updated);

    const records = await getAllRecords();
    expect(records[0].name).toBe('Updated Name');
  });

  it('should delete a record', async () => {
    const record = {
      id: 'test1',
      name: 'Test',
      category: 'cardiac',
      position: 'test',
      audioUrl: 'test.mp3',
      createdAt: new Date().toISOString()
    };

    await addRecord(record);
    await deleteRecord('test1');

    const records = await getAllRecords();
    expect(records).toHaveLength(0);
  });
});
