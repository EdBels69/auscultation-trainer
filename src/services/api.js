import { supabase } from './supabase';

// Simple in-memory cache
let soundsCache = null;
let cacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get all sounds
export async function getSounds(forceRefresh = false) {
    // Return cached data if available and not expired
    if (!forceRefresh && soundsCache && cacheTime && (Date.now() - cacheTime < CACHE_DURATION)) {
        return soundsCache;
    }

    const { data, error } = await supabase
        .from('sounds')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;

    // Map to match application structure
    const sounds = data.map(item => {
        // Use direct audio_url if present (legacy records from old project),
        // otherwise construct from file_path via current Supabase storage
        const audioUrl = item.audio_url
            || (item.file_path
                ? supabase.storage.from('sounds').getPublicUrl(item.file_path).data.publicUrl
                : null);

        return {
            id: item.id,
            name: item.name,
            nameEn: item.name_en || null,
            description: item.description,
            descriptionEn: item.description_en || null,
            category: item.category,
            position: item.position,
            difficulty: item.difficulty || 'medium',
            audioUrl: audioUrl,
            filePath: item.file_path,
            imageUrl: item.image_url,
            fileName: item.file_name,
            createdAt: item.created_at,
            linkedNodeKey: item.linked_node_key,
            audiogramUrl: item.audiogram_url
        };
    });

    // Update cache
    soundsCache = sounds;
    cacheTime = Date.now();

    return sounds;
}

// Add a new sound with audio file and optional image
// Add a new sound with audio file and optional image and audiogram
export async function addSound(soundData, file, imageFile = null, audiogramFile = null) {
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

    // 3. Upload audiogram file if provided
    let audiogramUrl = null;
    if (audiogramFile) {
        const safeAudiogramName = sanitizeFileName(audiogramFile.name);
        const audiogramPath = `${Date.now()}_AG_${safeAudiogramName}`;
        const { error: agError } = await supabase.storage
            .from('sounds')
            .upload(audiogramPath, audiogramFile);

        if (agError) {
            console.error('Audiogram upload error:', agError);
        } else {
            const { data: { publicUrl: agUrl } } = supabase.storage
                .from('sounds')
                .getPublicUrl(audiogramPath);
            audiogramUrl = agUrl;
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
            image_url: imageUrl,
            audiogram_url: audiogramUrl,
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
// Update a sound with optional new audio/image/audiogram files
export async function updateSoundWithFile(id, updates, audioFile = null, imageFile = null, audiogramFile = null, oldFilePath = null) {
    // Sanitize filename helper
    const sanitizeFileName = (name) => {
        const ext = name.split('.').pop();
        const baseName = name.replace(/\.[^/.]+$/, '');
        const clean = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
        return `${clean}.${ext}`;
    };

    let newFilePath = oldFilePath;
    let newImageUrl = updates.image_url || null;
    let newAudiogramUrl = updates.audiogram_url || null;

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

    // Upload new audiogram file if provided
    if (audiogramFile) {
        const safeAudiogramName = sanitizeFileName(audiogramFile.name);
        const audiogramPath = `${Date.now()}_AG_${safeAudiogramName}`;

        const { error: agError } = await supabase.storage
            .from('sounds')
            .upload(audiogramPath, audiogramFile);

        if (!agError) {
            const { data: { publicUrl } } = supabase.storage
                .from('sounds')
                .getPublicUrl(audiogramPath);
            newAudiogramUrl = publicUrl;
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
            file_name: audioFile ? audioFile.name : updates.file_name,
            image_url: newImageUrl,
            audiogram_url: newAudiogramUrl,
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

// Update learning node with optional file uploads
export async function updateLearningNodeWithFiles(id, nodeData, imageFile, audiogramFile) {
    let imageUrl = nodeData.image_url;
    let audiogramUrl = nodeData.audiogram_url;

    // Upload image if provided
    if (imageFile) {
        try {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `node_${id}_image_${Date.now()}.${fileExt}`;
            const filePath = `images/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('sounds')
                .upload(filePath, imageFile, { upsert: true });

            if (uploadError) {
                console.error('Image upload error:', uploadError);
                throw uploadError;
            }

            const { data: urlData } = supabase.storage
                .from('sounds')
                .getPublicUrl(filePath);

            imageUrl = urlData.publicUrl;
        } catch (err) {
            console.error('Image upload failed:', err);
            throw new Error('Ошибка загрузки изображения: ' + err.message);
        }
    }

    // Upload audiogram if provided
    if (audiogramFile) {
        try {
            const fileExt = audiogramFile.name.split('.').pop();
            const fileName = `node_${id}_audiogram_${Date.now()}.${fileExt}`;
            const filePath = `audiograms/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('sounds')
                .upload(filePath, audiogramFile, { upsert: true });

            if (uploadError) {
                console.error('Audiogram upload error:', uploadError);
                throw uploadError;
            }

            const { data: urlData } = supabase.storage
                .from('sounds')
                .getPublicUrl(filePath);

            audiogramUrl = urlData.publicUrl;
        } catch (err) {
            console.error('Audiogram upload failed:', err);
            throw new Error('Ошибка загрузки аудиограммы: ' + err.message);
        }
    }

    // Update node in database
    const { data, error } = await supabase
        .from('learning_nodes')
        .update({
            name: nodeData.name,
            description: nodeData.description,
            is_hidden: nodeData.is_hidden,
            order: nodeData.order,
            image_url: imageUrl,
            audiogram_url: audiogramUrl
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Node update error:', error);
        throw error;
    }
    return data;
}
