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
            filePath: item.file_path, // Needed for update/delete
            imageUrl: item.image_url,
            fileName: item.file_name,
            createdAt: item.created_at,
            linkedNodeKey: item.linked_node_key
        };
    });
}

// Add a new sound with audio file and optional image
export async function addSound(soundData, file, imageFile = null) {
    // Sanitize filename - remove non-ASCII characters
    const sanitizeFileName = (name) => {
        const ext = name.split('.').pop();
        const baseName = name.replace(/\.[^/.]+$/, '');
        // Replace non-ASCII with underscores, keep alphanumeric and basic punctuation
        const clean = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
        return `${clean}.${ext}`;
    };

    // 1. Upload audio file to storage
    const safeFileName = sanitizeFileName(file.name);
    const filePath = `${Date.now()}_${safeFileName}`;

    const { error: uploadError } = await supabase.storage
        .from('sounds')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    // 2. Upload image file if provided
    let imageUrl = null;
    if (imageFile) {
        const safeImageName = sanitizeFileName(imageFile.name);
        const imagePath = `${Date.now()}_${safeImageName}`;
        const { error: imageError } = await supabase.storage
            .from('sounds')
            .upload(imagePath, imageFile);

        if (imageError) {
            console.error('Image upload error:', imageError);
        } else {
            const { data: { publicUrl: imgUrl } } = supabase.storage
                .from('sounds')
                .getPublicUrl(imagePath);
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
            file_path: filePath,
            file_name: file.name,
            image_url: imageUrl,
            linked_node_key: soundData.linked_node_key
        })
        .select()
        .single();

    if (dbError) {
        // Cleanup files if DB insert fails
        await supabase.storage.from('sounds').remove([filePath]);
        if (imageFile) {
            const imageName = `${Date.now()}_${imageFile.name}`;
            await supabase.storage.from('sounds').remove([imageName]);
        }
        throw dbError;
    }

    return data;
}

// Update a sound (text fields only)
export async function updateSound(id, updates) {
    const { data, error } = await supabase
        .from('sounds')
        .update({
            name: updates.name,
            description: updates.description,
            category: updates.category,
            position: updates.position,
            linked_node_key: updates.linked_node_key
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Update a sound with optional new audio/image files
export async function updateSoundWithFile(id, updates, audioFile = null, imageFile = null, oldFilePath = null) {
    // Sanitize filename helper
    const sanitizeFileName = (name) => {
        const ext = name.split('.').pop();
        const baseName = name.replace(/\.[^/.]+$/, '');
        const clean = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
        return `${clean}.${ext}`;
    };

    let newFilePath = oldFilePath;
    let newImageUrl = updates.image_url || null;

    // Upload new audio file if provided
    if (audioFile) {
        const safeFileName = sanitizeFileName(audioFile.name);
        newFilePath = `${Date.now()}_${safeFileName}`;

        const { error: uploadError } = await supabase.storage
            .from('sounds')
            .upload(newFilePath, audioFile);

        if (uploadError) throw uploadError;

        // Delete old file if exists
        if (oldFilePath) {
            await supabase.storage.from('sounds').remove([oldFilePath]);
        }
    }

    // Upload new image file if provided
    if (imageFile) {
        const safeImageName = sanitizeFileName(imageFile.name);
        const imagePath = `${Date.now()}_${safeImageName}`;

        const { error: imageError } = await supabase.storage
            .from('sounds')
            .upload(imagePath, imageFile);

        if (!imageError) {
            const { data: { publicUrl } } = supabase.storage
                .from('sounds')
                .getPublicUrl(imagePath);
            newImageUrl = publicUrl;
        }
    }

    // Update database record
    const { data, error } = await supabase
        .from('sounds')
        .update({
            name: updates.name,
            description: updates.description,
            category: updates.category,
            position: updates.position,
            file_path: newFilePath,
            file_name: audioFile ? audioFile.name : updates.file_name,
            image_url: newImageUrl,
            linked_node_key: updates.linked_node_key
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

// --- Learning Structure API ---

export async function getLearningNodes() {
    const { data, error } = await supabase
        .from('learning_nodes')
        .select('*')
        .order('order', { ascending: true });

    if (error) throw error;
    return data;
}

export async function addLearningNode(nodeData) {
    const { data, error } = await supabase
        .from('learning_nodes')
        .insert(nodeData)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateLearningNode(id, updates) {
    const { data, error } = await supabase
        .from('learning_nodes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteLearningNode(id) {
    const { error } = await supabase
        .from('learning_nodes')
        .delete()
        .eq('id', id);

    if (error) throw error;
}
