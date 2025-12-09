import * as SQLite from 'expo-sqlite';
import { Sample } from '../types';

let db: SQLite.SQLiteDatabase;

export const initDatabase = async () => {
  db = await SQLite.openDatabaseAsync('synapse.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS samples (
      fileId TEXT PRIMARY KEY,
      sampleId INTEGER,
      status TEXT,
      fileName TEXT,
      uploadDate TEXT,
      collectionTime TEXT,
      depth REAL,
      latitude REAL,
      longitude REAL,
      latestAnalysis TEXT,
      logs TEXT,
      progress TEXT,
      verificationUpdates TEXT
    );
  `);
  
  // Simple migration attempts (ignore errors if columns exist)
  try { await db.execAsync('ALTER TABLE samples ADD COLUMN collectionTime TEXT;'); } catch (e) {}
  try { await db.execAsync('ALTER TABLE samples ADD COLUMN depth REAL;'); } catch (e) {}
};

export const saveSample = async (sample: Sample) => {
  if (!db) await initDatabase();
  
  await db.runAsync(
    `INSERT OR REPLACE INTO samples (fileId, sampleId, status, fileName, uploadDate, collectionTime, depth, latitude, longitude, latestAnalysis, logs, progress, verificationUpdates) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sample.fileId,
      sample.sampleId,
      sample.status,
      sample.fileName || '',
      sample.uploadDate || '',
      sample.collectionTime || '',
      sample.depth ?? null,
      sample.latitude ?? null,
      sample.longitude ?? null,
      JSON.stringify(sample.latestAnalysis || {}),
      JSON.stringify(sample.logs || []),
      JSON.stringify(sample.progress || []),
      JSON.stringify(sample.verificationUpdates || [])
    ]
  );
};

export const getSamples = async (): Promise<Sample[]> => {
  if (!db) await initDatabase();

  const result = await db.getAllAsync('SELECT * FROM samples ORDER BY uploadDate DESC');
  
  return result.map((row: any) => ({
    fileId: row.fileId,
    sampleId: row.sampleId,
    status: row.status as any,
    fileName: row.fileName,
    uploadDate: row.uploadDate,
    collectionTime: row.collectionTime,
    depth: row.depth,
    latitude: row.latitude,
    longitude: row.longitude,
    latestAnalysis: JSON.parse(row.latestAnalysis),
    logs: JSON.parse(row.logs),
    progress: JSON.parse(row.progress),
    verificationUpdates: JSON.parse(row.verificationUpdates)
  }));
};

export const updateSampleInDb = async (sample: Sample) => {
    await saveSample(sample);
};

export const clearAllSamples = async () => {
  if (!db) await initDatabase();
  await db.runAsync('DELETE FROM samples');
};

export const deleteSampleFromDb = async (fileId: string) => {
  if (!fileId) {
    console.warn('deleteSampleFromDb called with null or undefined fileId');
    return;
  }
  
  if (!db) {
    try {
      await initDatabase();
    } catch (e) {
      console.error('Failed to initialize database in deleteSampleFromDb', e);
      throw e;
    }
  }

  try {
    console.log(`Deleting sample with fileId: ${fileId}`);
    // Use array for bind parameters
    await db.runAsync('DELETE FROM samples WHERE fileId = ?', [fileId]);
    console.log(`Successfully deleted sample with fileId: ${fileId}`);
  } catch (error) {
    console.error('Error in deleteSampleFromDb:', error);
    throw error;
  }
};
