import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // Note: For seeding, we might need SERVICE_ROLE_KEY if RLS blocks anon inserts. 
// However, our policy allows 'authenticated' inserts. Anon key usually isn't authenticated as admin.
// But for now, let's assume the user might have set up public insert or we need to ask user to run SQL.
// Actually, better to just output the SQL for data insertion if this fails.

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log('Seeding theory nodes...');

    // 1. Create Root Folders
    const roots = [
        { title: 'Кардиология', is_folder: true, order: 1, category: 'cardiac' },
        { title: 'Пульмонология', is_folder: true, order: 2, category: 'pulmonary' }
    ];

    for (const root of roots) {
        const { data: rootNode, error: rootError } = await supabase
            .from('theory_nodes')
            .insert(root)
            .select()
            .single();

        if (rootError) {
            console.error(`Error creating root ${root.title}:`, rootError.message);
            continue;
        }
        console.log(`Created root: ${root.title}`);

        // 2. Create Sub-folders
        const subFolders = [
            { title: 'Норма', is_folder: true, order: 1, parent_id: rootNode.id },
            { title: 'Патология', is_folder: true, order: 2, parent_id: rootNode.id }
        ];

        for (const sub of subFolders) {
            const { data: subNode, error: subError } = await supabase
                .from('theory_nodes')
                .insert(sub)
                .select()
                .single();

            if (subError) {
                console.error(`Error creating subfolder ${sub.title}:`, subError.message);
                continue;
            }
            console.log(`  Created subfolder: ${sub.title}`);

            // 3. Create Example Articles
            const articles = [
                {
                    title: sub.title === 'Норма' ? 'Введение в норму' : 'Общие патологии',
                    is_folder: false,
                    order: 1,
                    parent_id: subNode.id,
                    content: `# ${sub.title === 'Норма' ? 'Введение в норму' : 'Общие патологии'}\n\nЗдесь будет описание...`
                }
            ];

            for (const article of articles) {
                const { error: artError } = await supabase
                    .from('theory_nodes')
                    .insert(article);

                if (artError) console.error(`Error creating article:`, artError.message);
                else console.log(`    Created article: ${article.title}`);
            }
        }
    }
}

seed();
