(() => {
  const forbidden = 'script,style,title,textarea,input,select,option,.brand-name';
  function colorName(root) {
    if (root.nodeType === Node.TEXT_NODE) { paint(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE || root.closest(forbidden)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(paint);
  }
  function paint(node) {
    if (!node.parentElement || node.parentElement.closest(forbidden)) return;
    const source = node.nodeValue;
    const matches = [...source.matchAll(/(conexão)(\s+)(comunidade)/gi)];
    if (!matches.length) return;
    const fragment = document.createDocumentFragment();
    let offset = 0;
    for (const match of matches) {
      fragment.append(document.createTextNode(source.slice(offset, match.index)));
      const name = document.createElement('span');
      name.className = 'brand-name';
      for (const [value, cls] of [[match[1], 'brand-word-first'], [match[2], ''], [match[3], 'brand-word-second']]) {
        const part = document.createElement('span');
        part.className = cls;
        part.textContent = value;
        name.append(part);
      }
      fragment.append(name);
      offset = match.index + match[0].length;
    }
    fragment.append(document.createTextNode(source.slice(offset)));
    node.replaceWith(fragment);
  }
  colorName(document.body);
  new MutationObserver(changes => {
    for (const change of changes) {
      if (change.type === 'characterData') colorName(change.target);
      else change.addedNodes.forEach(colorName);
    }
  }).observe(document.body, {childList:true,subtree:true,characterData:true});
})();
