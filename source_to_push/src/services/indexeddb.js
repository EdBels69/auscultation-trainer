// IndexedDB wrapper for audio records storage
// Supports large files (no size limit like LocalStorage)

const DB_NAME = 'AuscultationDB';
const STORE_NAME = 'audioRecords';
const DB_VERSION = 1;

let db = null;

// Initialize database
export const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = database.createObjectStore(STORE_NAME, {
                    keyPath: 'id'
                });

                // Create indexes for faster queries
                objectStore.createIndex('category', 'category', { unique: false });
                objectStore.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };
    });
};

// Get all records
export const getAllRecords = async () => {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
};

// Add a new record
export const addRecord = async (record) => {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.add(record);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// Update a record
export const updateRecord = async (record) => {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.put(record);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// Delete a record
export const deleteRecord = async (id) => {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// Get records by category
export const getRecordsByCategory = async (category) => {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const index = objectStore.index('category');
        const request = index.getAll(category);

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
};

// Clear all records (for testing)
export const clearAllRecords = async () => {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};
