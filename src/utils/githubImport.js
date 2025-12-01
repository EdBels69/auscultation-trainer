import { initDB, getAllRecords, addRecord } from '../utils/indexedDB';
import { audioFiles } from '../data/audioConfig';

/**
 * Import audio files from GitHub into IndexedDB
 * Downloads files and converts to base64 for storage
 */
export const importAudioFiles = async (onProgress) => {
    try {
        await initDB();

        // Check if already imported
        const existing = await getAllRecords();
        if (existing.length > 0) {
            console.log('Audio files already imported');
            return { success: true, message: 'Файлы уже импортированы', count: existing.length };
        }

        const results = [];
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < audioFiles.length; i++) {
            const file = audioFiles[i];

            if (onProgress) {
                onProgress(i + 1, audioFiles.length, file.name);
            }

            try {
                // Download file from GitHub
                const response = await fetch(file.url);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                // Convert to blob
                const blob = await response.blob();

                // Convert blob to base64
                const base64 = await blobToBase64(blob);

                // Create record
                const record = {
                    id: `github_${Date.now()}_${i}`,
                    name: file.name,
                    description: file.description,
                    category: file.category,
                    position: file.position,
                    audioUrl: base64,
                    fileName: file.fileName,
                    fileSize: blob.size,
                    source: 'github',
                    createdAt: new Date().toISOString()
                };

                // Save to IndexedDB
                await addRecord(record);

                successCount++;
                results.push({ success: true, file: file.name });

            } catch (error) {
                console.error(`Error importing ${file.name}:`, error);
                errorCount++;
                results.push({ success: false, file: file.name, error: error.message });
            }
        }

        return {
            success: errorCount === 0,
            message: `Импортировано: ${successCount}, Ошибок: ${errorCount}`,
            count: successCount,
            results
        };

    } catch (error) {
        console.error('Import failed:', error);
        throw error;
    }
};

/**
 * Convert Blob to base64 data URL
 */
const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * Check if import is needed
 */
export const needsImport = async () => {
    try {
        await initDB();
        const records = await getAllRecords();
        return records.length === 0;
    } catch (error) {
        console.error('Error checking import status:', error);
        return true;
    }
};
