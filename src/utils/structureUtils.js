export const buildTree = (flatData) => {
  const map = {};
  const roots = [];

  flatData.forEach(item => {
    map[item.id] = { ...item, children: [] };
  });

  flatData.forEach(item => {
    if (item.parent_id && map[item.parent_id]) {
      map[item.parent_id].children.push(map[item.id]);
    } else {
      roots.push(map[item.id]);
    }
  });

  const sortRecursive = (nodes) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order);
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        sortRecursive(node.children);
      }
    });
  };

  sortRecursive(roots);
  return roots;
};

export const flattenTree = (tree, parentKey = null) => {
  let result = [];

  tree.forEach(node => {
    const { children, ...nodeData } = node;
    result.push({ ...nodeData, parentKey });

    if (children && children.length > 0) {
      result = result.concat(flattenTree(children, node.node_key));
    }
  });

  return result;
};

export const findNodeByKey = (tree, key) => {
  for (const node of tree) {
    if (node.node_key === key) {
      return node;
    }
    if (node.children) {
      const found = findNodeByKey(node.children, key);
      if (found) return found;
    }
  }
  return null;
};

export function buildLearningTree(nodes) {
    const nodeMap = {};
    const tree = { systems: [] };

    nodes.forEach(node => {
        nodeMap[node.key] = {
            ...node,
            key: node.key,
            name: node.name,
            type: node.type,
            description: node.description,
            image_url: node.image_url,
            audiogram_url: node.audiogram_url,
            icon: node.icon,
            is_hidden: node.is_hidden,
            categories: [],
            items: [],
            subtypes: []
        };
    });

    nodes.forEach(node => {
        const mappedNode = nodeMap[node.key];

        if (!node.parent_key) {
            tree.systems.push(mappedNode);
        } else if (nodeMap[node.parent_key]) {
            const parent = nodeMap[node.parent_key];

            if (node.type === 'category') {
                parent.categories.push(mappedNode);
            } else if (node.type === 'item') {
                parent.items.push(mappedNode);
            } else if (node.type === 'subtype') {
                parent.subtypes.push(mappedNode);
            }
        }
    });

    return tree;
}
