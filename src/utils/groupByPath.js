export function groupByPath(subproyectos) {
    const tree = {};
  
    subproyectos.forEach((sp) => {
      const proyecto = sp.proyecto || 'Sin proyecto';
      const pathArray = sp.path || ['Sin grupo'];
  
      if (!tree[proyecto]) {
        tree[proyecto] = {};
      }
  
      let current = tree[proyecto];
  
      pathArray.forEach((part, idx) => {
        if (!current[part]) {
          current[part] = { __children: {}, __items: [] };
        }
        if (idx === pathArray.length - 1) {
          current[part].__items.push(sp);
        } else {
          current = current[part].__children;
        }
      });
    });
  
    return tree;
  }
  