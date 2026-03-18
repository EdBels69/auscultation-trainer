import { supabase } from './supabase';

export async function getLearningNodes() {
    const { data, error } = await supabase
        .from('learning_nodes')
        .select('*')
        .order('order_index', { ascending: true });

    if (error) {
        console.error('Error fetching learning nodes:', error);
        throw error;
    }

    return data || [];
}

export async function getAudioRecords() {
    const { data, error } = await supabase
        .from('audio_records')
        .select('*')
        .order('created_at');

    if (error) {
        console.error('Error fetching audio records:', error);
        throw error;
    }

    return data || [];
}


export async function saveLearningNode(nodeData) {
    const { data, error } = await supabase
        .from('learning_nodes')
        .upsert(nodeData, {
            onConflict: 'key'
        })
        .select()
        .single();

    if (error) {
        console.error('Error saving learning node:', error);
        throw error;
    }

    return data;
}

export async function deleteLearningNode(id) {
    const { error } = await supabase
        .from('learning_nodes')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting learning node:', error);
        throw error;
    }
}

export async function saveAudioRecord(recordData) {
    const { data, error } = await supabase
        .from('audio_records')
        .upsert(recordData)
        .select()
        .single();

    if (error) {
        console.error('Error saving audio record:', error);
        throw error;
    }

    return data;
}

export async function deleteAudioRecord(id) {
    const { error } = await supabase
        .from('audio_records')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting audio record:', error);
        throw error;
    }
}

export async function uploadAudioFile(file, path) {
    const { data, error } = await supabase.storage
        .from('audio')
        .upload(path, file, {
            cacheControl: '3600',
            upsert: true
        });

    if (error) {
        console.error('Error uploading audio file:', error);
        throw error;
    }

    const { data: { publicUrl } } = supabase.storage
        .from('audio')
        .getPublicUrl(path);

    return publicUrl;
}

export async function uploadImage(file, bucket, path) {
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
            cacheControl: '3600',
            upsert: true
        });

    if (error) {
        console.error('Error uploading image:', error);
        throw error;
    }

    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

    return publicUrl;
}

let soundsCache = null;

export async function getSounds(forceRefresh = false) {
    if (!forceRefresh && soundsCache) {
        return soundsCache;
    }

    const { data, error } = await supabase
        .from('audio_records')
        .select('*')
        .order('category', { ascending: true })
        .order('position', { ascending: true });

    if (error) {
        console.error('Error fetching sounds:', error);
        throw error;
    }

    const mapped = (data || []).map(record => ({
        id: record.id,
        name: record.name,
        description: record.description,
        position: record.position,
        category: record.category,
        linkedNodeKey: record.linked_node_key,
        audioUrl: record.audio_url,
        filePath: record.file_path,
        createdAt: record.created_at,
        auscultationPoint: record.auscultation_point,
        auscultationImageUrl: record.auscultation_image_url,
        explanation: record.explanation || null,
        clinicalContext: record.clinical_context || null,
        difficulty: record.difficulty || 'medium',
    }));

    soundsCache = mapped;
    return mapped;
}

export async function addSound(soundData, audioFile, auscultationImageFile) {
    let audioUrl = null;
    let filePath = null;
    let auscultationImageUrl = null;

    if (audioFile) {
        const fileExt = audioFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        filePath = `sounds/${fileName}`;
        audioUrl = await uploadAudioFile(audioFile, filePath);
    }

    if (auscultationImageFile) {
        const fileExt = auscultationImageFile.name.split('.').pop();
        const fileName = `auscultation_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        auscultationImageUrl = await uploadImage(auscultationImageFile, 'images', `auscultation/${fileName}`);
    }

    const { data, error } = await supabase
        .from('audio_records')
        .insert({
            name: soundData.name,
            description: soundData.description,
            category: soundData.category,
            linked_node_key: soundData.linked_node_key,
            audio_url: audioUrl,
            file_path: filePath,
            auscultation_point: soundData.auscultation_point || null,
            auscultation_image_url: auscultationImageUrl,
            explanation: soundData.explanation || null,
            clinical_context: soundData.clinical_context || null,
            difficulty: soundData.difficulty || 'medium',
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding sound:', error);
        throw error;
    }

    soundsCache = null;
    return data;
}

export async function updateSound(id, soundData) {
    console.log('updateSound called with:', { id, soundData });

    const updateData = {
        name: soundData.name,
        description: soundData.description || '',
        category: soundData.category,
        linked_node_key: soundData.linked_node_key,
        auscultation_point: soundData.auscultation_point ?? null,
        explanation: soundData.explanation ?? null,
        clinical_context: soundData.clinical_context ?? null,
        difficulty: soundData.difficulty || 'medium',
    };

    if (typeof soundData.position === 'number') {
        updateData.position = soundData.position;
    }

    console.log('updateSound sending:', updateData);

    const { data, error } = await supabase
        .from('audio_records')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating sound:', error);
        throw error;
    }

    soundsCache = null;
    return data;
}

export async function updateSoundWithFile(id, soundData, audioFile, imageFile, audiogramFile, oldFilePath) {
    let audioUrl = soundData.audio_url;
    let filePath = oldFilePath;

    if (audioFile) {
        if (oldFilePath) {
            await supabase.storage
                .from('audio')
                .remove([oldFilePath]);
        }

        const fileExt = audioFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        filePath = `sounds/${fileName}`;
        audioUrl = await uploadAudioFile(audioFile, filePath);
    }

    const { data, error } = await supabase
        .from('audio_records')
        .update({
            name: soundData.name,
            description: soundData.description || '',
            category: soundData.category,
            linked_node_key: soundData.linked_node_key,
            audio_url: audioUrl,
            file_path: filePath,
            auscultation_point: soundData.auscultation_point ?? null,
            explanation: soundData.explanation ?? null,
            clinical_context: soundData.clinical_context ?? null,
            difficulty: soundData.difficulty || 'medium',
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating sound with file:', error);
        throw error;
    }

    soundsCache = null;
    return data;
}

export async function deleteSound(id, filePath) {
    if (filePath) {
        await supabase.storage
            .from('audio')
            .remove([filePath]);
    }

    const { error } = await supabase
        .from('audio_records')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting sound:', error);
        throw error;
    }

    soundsCache = null;
}

export async function addLearningNode(nodeData) {
    const { data, error } = await supabase
        .from('learning_nodes')
        .insert({
            key: nodeData.key,
            name: nodeData.name,
            title: nodeData.title || nodeData.name,
            type: nodeData.type,
            parent_key: nodeData.parent_key || null,
            parent_id: nodeData.parent_id || null,
            description: nodeData.description || '',
            order_index: nodeData.order_index || nodeData.order || 0,
            is_hidden: nodeData.is_hidden || false,
            icon: nodeData.icon || null
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding learning node:', error);
        throw error;
    }

    return data;
}

export async function updateLearningNode(id, nodeData) {
    console.log('updateLearningNode called with:', { id, nodeData });

    const updateData = {};

    if (nodeData.name !== undefined) updateData.name = nodeData.name;
    if (nodeData.title !== undefined) updateData.title = nodeData.title;
    if (nodeData.name !== undefined && nodeData.title === undefined) updateData.title = nodeData.name;
    if (nodeData.description !== undefined) updateData.description = nodeData.description;
    if (nodeData.is_hidden !== undefined) updateData.is_hidden = nodeData.is_hidden;
    if (nodeData.order_index !== undefined) updateData.order_index = nodeData.order_index;
    if (nodeData.order !== undefined && nodeData.order_index === undefined) updateData.order_index = nodeData.order;
    if (nodeData.icon !== undefined) updateData.icon = nodeData.icon;
    if (nodeData.content !== undefined) updateData.content = nodeData.content;
    if (nodeData.sort_order !== undefined) updateData.sort_order = nodeData.sort_order;
    if (nodeData.parent_id !== undefined) updateData.parent_id = nodeData.parent_id;
    if (nodeData.sidebar_title !== undefined) updateData.sidebar_title = nodeData.sidebar_title;
    if (nodeData.is_folder !== undefined) updateData.is_folder = nodeData.is_folder;
    if (nodeData.category !== undefined) updateData.category = nodeData.category;

    console.log('Updating with data:', updateData);

    if (Object.keys(updateData).length === 0) {
        console.log('No fields to update, skipping');
        const { data: existingData } = await supabase
            .from('learning_nodes')
            .select()
            .eq('id', id)
            .maybeSingle();
        return existingData;
    }

    const { error } = await supabase
        .from('learning_nodes')
        .update(updateData)
        .eq('id', id);

    if (error) {
        console.error('Error updating learning node:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
    }

    const { data: updatedData, error: selectError } = await supabase
        .from('learning_nodes')
        .select()
        .eq('id', id)
        .maybeSingle();

    if (selectError) {
        console.error('Error fetching updated node:', selectError);
    }

    console.log('Update successful:', updatedData);
    return updatedData;
}

export async function updateLearningNodeWithFiles(id, nodeData, imageFile, audiogramFile) {
    let imageUrl = nodeData.image_url;
    let audiogramUrl = nodeData.audiogram_url;

    if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `node_${id}_image_${Date.now()}.${fileExt}`;
        const filePath = `images/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(filePath, imageFile, { upsert: true });

        if (uploadError) {
            console.error('Image upload error:', uploadError);
        } else {
            const { data: urlData } = supabase.storage
                .from('images')
                .getPublicUrl(filePath);
            imageUrl = urlData.publicUrl;
        }
    }

    if (audiogramFile) {
        const fileExt = audiogramFile.name.split('.').pop();
        const fileName = `node_${id}_audiogram_${Date.now()}.${fileExt}`;
        const filePath = `audiograms/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(filePath, audiogramFile, { upsert: true });

        if (uploadError) {
            console.error('Audiogram upload error:', uploadError);
        } else {
            const { data: urlData } = supabase.storage
                .from('images')
                .getPublicUrl(filePath);
            audiogramUrl = urlData.publicUrl;
        }
    }

    const { error } = await supabase
        .from('learning_nodes')
        .update({
            name: nodeData.name,
            title: nodeData.title || nodeData.name,
            description: nodeData.description,
            is_hidden: nodeData.is_hidden,
            order_index: nodeData.order_index || nodeData.order,
            image_url: imageUrl,
            audiogram_url: audiogramUrl,
            icon: nodeData.icon
        })
        .eq('id', id);

    if (error) {
        console.error('Error updating learning node with files:', error);
        throw error;
    }

    const { data, error: fetchError } = await supabase
        .from('learning_nodes')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (fetchError) {
        console.error('Error fetching updated learning node:', fetchError);
        throw fetchError;
    }

    return data;
}

export async function updateSoundPositions(updates) {
    console.log('updateSoundPositions called with:', updates);

    const validUpdates = updates.filter(u => typeof u.position === 'number');
    if (validUpdates.length !== updates.length) {
        console.error('Invalid position values detected:', updates);
    }

    const promises = validUpdates.map(({ id, position }) =>
        supabase
            .from('audio_records')
            .update({ position })
            .eq('id', id)
    );

    const results = await Promise.all(promises);

    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
        console.error('Error updating positions:', errors);
        throw new Error('Failed to update positions');
    }

    soundsCache = null;
    return true;
}

export async function getTheoryNodes() {
    return getLearningNodes();
}

export async function addTheoryNode(nodeData) {
    return addLearningNode(nodeData);
}

export async function updateTheoryNode(id, nodeData) {
    return updateLearningNode(id, nodeData);
}

export async function deleteTheoryNode(id) {
    return deleteLearningNode(id);
}
