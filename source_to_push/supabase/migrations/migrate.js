import { createClient } from '@supabase/supabase-js';
import { audioRecords } from '../src/data/audioConfig.js';
import path from 'path';
import https from 'https';

// Load env vars manually since we're running in Node
const SUPABASE_URL = 'https://uygwegdngztmbpuhsdrl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5Z3dlZ2RuZ3p0bWJwdWhzZHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NjczODQsImV4cCI6MjA4MDE0MzM4NH0.TBDRNSOK8w6xh9OefGVqChzQn0Ab-xZ6wVJ7D_sCAEg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function migrate() {
  console.log('Starting migration...');

  for (const record of audioRecords) {
    try {
      console.log(`Processing ${record.name}...`);

      // 1. Download file
      const buffer = await downloadFile(record.audioUrl);

      // 2. Upload to Storage
      const fileName = `${record.category}/${path.basename(record.fileName)}`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('sounds')
        .upload(fileName, buffer, {
          contentType: 'audio/mpeg',
          upsert: true
        });

      if (uploadError) {
        console.error(`Upload error for ${record.name}:`, uploadError);
        continue;
      }

      // 3. Get Public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from('sounds')
        .getPublicUrl(fileName);

      // 4. Insert into DB
      const { error: dbError } = await supabase
        .from('sounds')
        .upsert({
          name: record.name,
          description: record.description,
          category: record.category,
          position: record.position,
          file_path: fileName,
          file_name: record.fileName,
          file_size: buffer.length,
          // We can store the public URL if we want, but constructing it is safer usually
          // Let's just rely on file_path
        }, { onConflict: 'name' });
      // Note: 'name' constraint might not exist, but let's assume we want to avoid dupes based on name or just insert.
      // If no unique constraint on name, upsert might act like insert. 
      // Ideally we'd use an ID, but we are generating new UUIDs.
      // Let's just use insert for simplicity if upsert fails or modify to check existence.

      if (dbError) {
        // Fallback to insert if upsert fails due to missing constraint
        const { error: insertError } = await supabase
          .from('sounds')
          .insert({
            name: record.name,
            description: record.description,
            category: record.category,
            position: record.position,
            file_path: fileName,
            file_name: record.fileName,
            file_size: buffer.length
          });

        if (insertError) console.error(`DB error for ${record.name}:`, insertError);
        else console.log(`✓ Migrated ${record.name}`);
      } else {
        console.log(`✓ Migrated ${record.name}`);
      }

    } catch (err) {
      console.error(`Error processing ${record.name}:`, err);
    }
  }

  console.log('Migration complete!');
}

migrate();
