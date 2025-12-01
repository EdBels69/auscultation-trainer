import { supabase } from './supabase';

// Get all sounds
export async function getSounds() {
    const { data, error } = await supabase
        .from('sounds')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;

    // Map to match application structure
    return data.map(item => {
        // Get public URL from file_path
        const audioUrl = item.file_path
            ? supabase.storage.from('sounds').getPublicUrl(item.file_path).data.publicUrl
            : null;

        return {
            id: item.id,
            name: item.name,
            description: item.description,
            category: item.category,
            position: item.position,
            audioUrl: audioUrl,
            image_url: item.image_url,
            fileName: item.file_name,
            createdAt: item.created_at
        };
    });
}

// Add a new sound with audio file and optional image
export async function addSound(soundData, file, imageFile = null) {
    // 1. Upload audio file to storage
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
        .from('sounds')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl: audioUrl } } = supabase.storage
        .from('sounds')
        .getPublicUrl(filePath);

    // 2. Upload image file if provided
    let imageUrl = null;
    if (imageFile) {
        const imageName = `${Date.now()}_${imageFile.name}`;
        const { error: imageError } = await supabase.storage
            .from('sounds')
            .upload(imageName, imageFile);

        if (imageError) {
            console.error('Image upload error:', imageError);
        } else {
            const { data: { publicUrl: imgUrl } } = supabase.storage
                .from('sounds')
                .getPublicUrl(imageName);
            imageUrl = imgUrl;
        }
    }

    // 3. Insert record into DB
    const { data, error: dbError } = await supabase
        .from('sounds')
        .insert({
            name: soundData.name,
            description: soundData.description,
            category: soundData.category,
            position: soundData.position,
            audio_url: audioUrl,
            file_name: file.name,
            image_url: imageUrl
        })
        .select()
        .single();

    if (dbError) {
        // Cleanup files if DB insert fails
        await supabase.storage.from('sounds').remove([filePath]);
        if (imageUrl) {
            const imageName = `${Date.now()}_${imageFile.name}`;
            await supabase.storage.from('sounds').remove([imageName]);
        }
        throw dbError;
    }

    return data;
}

// Update a sound
export async function updateSound(id, updates) {
    const { data, error } = await supabase
        .from('sounds')
        .update({
            name: updates.name,
            description: updates.description,
            category: updates.category,
            position: updates.position
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Delete a sound
export async function deleteSound(id, filePath) {
    // 1. Delete from DB
    const { error: dbError } = await supabase
        .from('sounds')
        .delete()
        .eq('id', id);

    if (dbError) throw dbError;

    // 2. Delete from Storage
    if (filePath) {
        const { error: storageError } = await supabase
            .storage
            .from('sounds')
            .remove([filePath]);

        if (storageError) console.error('Error deleting file:', storageError);
    }
}

// --- Theory API ---

export async function getTheoryNodes() {
    const { data, error } = await supabase
        .from('theory_nodes')
        .select('*')
        .order('order', { ascending: true });

    if (error) throw error;
    return data;
}

export async function addTheoryNode(nodeData) {
    const { data, error } = await supabase
        .from('theory_nodes')
        .insert(nodeData)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateTheoryNode(id, updates) {
    const { data, error } = await supabase
        .from('theory_nodes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteTheoryNode(id) {
    const { error } = await supabase
        .from('theory_nodes')
        .delete()
        .eq('id', id);

    if (error) throw error;
}
