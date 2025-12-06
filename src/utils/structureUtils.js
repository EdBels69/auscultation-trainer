export const buildLearningTree = (data) => {
    const tree = [];
    const map = {};

    // Filter out hidden nodes if needed? 
    // Usually for Client we filter hidden, for Admin we show them.
    // We'll let the caller do filtering.

    // Sort by order
    const sortedData = [...data].sort((a, b) => (a.order || 0) - (b.order || 0));

    sortedData.forEach(item => {
        // Map structure to match what UI expects (similar to learningStructure.js)
        map[item.id] = {
            ...item,
            key: item.key, // Ensure key field is present
            // properties expected by TopicTree:
            categories: [], // if system
            items: [],      // if category
            subtypes: [],   // if item
        };
    });

    sortedData.forEach(item => {
        if (item.parent_id && map[item.parent_id]) {
            const parent = map[item.parent_id];
            const child = map[item.id];

            if (parent.type === 'system') {
                parent.categories.push(child);
            } else if (parent.type === 'category') {
                parent.items.push(child);
            } else if (parent.type === 'item') {
                // TopicTree expects subtypes to be strings or objects {name, ...}
                // We'll keep it as object
                parent.subtypes.push(child);
            }
        } else {
            // Only systems should be at root usually, or orphans
            if (item.type === 'system') {
                tree.push(map[item.id]);
            }
        }
    });

    return { systems: tree };
};
