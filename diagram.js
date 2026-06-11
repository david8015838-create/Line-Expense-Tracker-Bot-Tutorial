// 渲染互動架構圖 + 節點教學側邊抽屜
(function () {
  const wrap = document.querySelector('.workflow-diagram-wrap');
  if (!wrap) return;

  const diagram = document.createElement('div');
  diagram.className = 'workflow-diagram';
  diagram.style.width = DIAGRAM_VIEWBOX.w + 'px';
  diagram.style.height = DIAGRAM_VIEWBOX.h + 'px';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'diagram-edges');
  svg.setAttribute('viewBox', `0 0 ${DIAGRAM_VIEWBOX.w} ${DIAGRAM_VIEWBOX.h}`);
  diagram.appendChild(svg);

  const nodeById = {};
  DIAGRAM_NODES.forEach((n) => (nodeById[n.id] = n));

  // ── 畫連線 ──
  function anchor(node, side) {
    const { w, h } = DIAGRAM_NODE_SIZE;
    if (side === 'right') return { x: node.x + w, y: node.y + h / 2 };
    if (side === 'left') return { x: node.x, y: node.y + h / 2 };
    if (side === 'top') return { x: node.x + w / 2, y: node.y };
    return { x: node.x + w / 2, y: node.y + h }; // bottom
  }

  DIAGRAM_EDGES.forEach((edge) => {
    const from = nodeById[edge.from];
    const to = nodeById[edge.to];
    if (!from || !to) return;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    let d;

    if (edge.kind === 'model') {
      // 垂直連線：from(模型節點) 在下方，連到 to(AI Agent) 底部
      const start = anchor(from, 'top');
      const end = anchor(to, 'bottom');
      const midY = (start.y + end.y) / 2;
      d = `M ${start.x},${start.y} C ${start.x},${midY} ${end.x},${midY} ${end.x},${end.y}`;
      path.setAttribute('class', 'diagram-edge diagram-edge--model');
    } else {
      const start = anchor(from, 'right');
      const end = anchor(to, 'left');
      const midX = (start.x + end.x) / 2;
      d = `M ${start.x},${start.y} C ${midX},${start.y} ${midX},${end.y} ${end.x},${end.y}`;
      path.setAttribute('class', 'diagram-edge');
    }

    path.setAttribute('d', d);
    svg.appendChild(path);

    if (edge.label) {
      const start = anchor(from, 'right');
      const end = anchor(to, 'left');
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('class', 'diagram-edge-label');
      text.setAttribute('x', (start.x + end.x) / 2);
      text.setAttribute('y', (start.y + end.y) / 2 - 8);
      text.setAttribute('text-anchor', 'middle');
      text.textContent = edge.label;
      svg.appendChild(text);
    }
  });

  // ── 畫節點卡片 ──
  DIAGRAM_NODES.forEach((node) => {
    const el = document.createElement('div');
    el.className = `diagram-node diagram-node--${node.category}`;
    el.style.left = node.x + 'px';
    el.style.top = node.y + 'px';
    el.style.width = DIAGRAM_NODE_SIZE.w + 'px';
    el.dataset.node = node.id;
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.innerHTML = `
      <div class="dn-top">
        <span class="dn-icon">${node.icon}</span>
        <span class="dn-label">${node.label}</span>
      </div>
      <div class="dn-sub">${node.sub}</div>
      <div class="dn-type">${node.type}</div>
    `;
    el.addEventListener('click', () => {
      if (dragged) return;
      openPanel(node.id);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openPanel(node.id);
      }
    });
    diagram.appendChild(el);
  });

  wrap.appendChild(diagram);

  // ── 縮放控制按鈕 ──
  const zoomControls = document.createElement('div');
  zoomControls.className = 'diagram-zoom-controls';
  zoomControls.innerHTML = `
    <button class="diagram-zoom-btn diagram-zoom-in" title="放大">＋</button>
    <div class="diagram-zoom-level">100%</div>
    <button class="diagram-zoom-btn diagram-zoom-out" title="縮小">－</button>
    <button class="diagram-zoom-btn diagram-zoom-reset" title="重置視角">⤢</button>
  `;
  wrap.appendChild(zoomControls);
  const zoomLevelEl = zoomControls.querySelector('.diagram-zoom-level');

  // ── 拖移 + 縮放（仿 n8n 畫布操作）──
  const minZoom = 0.3;
  const maxZoom = 2;
  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let dragged = false;

  function applyTransform() {
    diagram.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    zoomLevelEl.textContent = Math.round(zoom * 100) + '%';
  }

  function setZoom(newZoom, originX, originY) {
    newZoom = Math.min(maxZoom, Math.max(minZoom, newZoom));
    const ratio = newZoom / zoom;
    panX = originX - (originX - panX) * ratio;
    panY = originY - (originY - panY) * ratio;
    zoom = newZoom;
    applyTransform();
  }

  function fitToScreen() {
    const padding = 24;
    const minScale = 0.42;
    zoom = Math.max(minScale, Math.min(1, (wrap.clientWidth - padding) / DIAGRAM_VIEWBOX.w));
    panX = padding / 2;
    panY = 16;
    // 維持原本「依寬度自動縮放」的外框高度，放大/縮小時只在這個框內平移，不改變外框大小
    wrap.style.height = Math.round(DIAGRAM_VIEWBOX.h * zoom + 32) + 'px';
    applyTransform();
  }
  fitToScreen();

  let userInteracted = false;
  window.addEventListener('resize', () => {
    if (!userInteracted) fitToScreen();
  });

  // 滑鼠滾輪縮放（以游標位置為中心）
  wrap.addEventListener('wheel', (e) => {
    e.preventDefault();
    userInteracted = true;
    const rect = wrap.getBoundingClientRect();
    const originX = e.clientX - rect.left;
    const originY = e.clientY - rect.top;
    setZoom(zoom * (1 - e.deltaY * 0.0015), originX, originY);
  }, { passive: false });

  // 縮放按鈕
  zoomControls.querySelector('.diagram-zoom-in').addEventListener('click', () => {
    userInteracted = true;
    setZoom(zoom + 0.15, wrap.clientWidth / 2, wrap.clientHeight / 2);
  });
  zoomControls.querySelector('.diagram-zoom-out').addEventListener('click', () => {
    userInteracted = true;
    setZoom(zoom - 0.15, wrap.clientWidth / 2, wrap.clientHeight / 2);
  });
  zoomControls.querySelector('.diagram-zoom-reset').addEventListener('click', () => {
    userInteracted = false;
    fitToScreen();
  });

  // 滑鼠拖移平移
  let isPanning = false;
  let startX, startY, startPanX, startPanY;

  wrap.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isPanning = true;
    dragged = false;
    startX = e.clientX;
    startY = e.clientY;
    startPanX = panX;
    startPanY = panY;
    diagram.classList.add('dragging');
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragged = true;
      userInteracted = true;
    }
    if (!dragged) return;
    panX = startPanX + dx;
    panY = startPanY + dy;
    applyTransform();
  });

  window.addEventListener('mouseup', () => {
    if (!isPanning) return;
    isPanning = false;
    diagram.classList.remove('dragging');
  });

  // 觸控：單指拖移、雙指縮放
  let touchState = null;

  wrap.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      dragged = false;
      touchState = {
        mode: 'pan',
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startPanX: panX,
        startPanY: panY,
      };
    } else if (e.touches.length === 2) {
      const [t1, t2] = e.touches;
      touchState = {
        mode: 'pinch',
        startDist: Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY),
        startZoom: zoom,
        midX: (t1.clientX + t2.clientX) / 2,
        midY: (t1.clientY + t2.clientY) / 2,
        startPanX: panX,
        startPanY: panY,
      };
    }
  }, { passive: true });

  wrap.addEventListener('touchmove', (e) => {
    if (!touchState) return;
    e.preventDefault();
    userInteracted = true;
    const rect = wrap.getBoundingClientRect();

    if (touchState.mode === 'pan' && e.touches.length === 1) {
      const dx = e.touches[0].clientX - touchState.startX;
      const dy = e.touches[0].clientY - touchState.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragged = true;
      panX = touchState.startPanX + dx;
      panY = touchState.startPanY + dy;
      applyTransform();
    } else if (touchState.mode === 'pinch' && e.touches.length === 2) {
      const [t1, t2] = e.touches;
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const newZoom = Math.min(maxZoom, Math.max(minZoom, touchState.startZoom * (dist / touchState.startDist)));
      const ratio = newZoom / touchState.startZoom;
      const originX = touchState.midX - rect.left;
      const originY = touchState.midY - rect.top;
      panX = originX - (originX - touchState.startPanX) * ratio;
      panY = originY - (originY - touchState.startPanY) * ratio;
      zoom = newZoom;
      applyTransform();
    }
  }, { passive: false });

  wrap.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) touchState = null;
  });

  // ── 節點教學 Panel ──
  const overlay = document.querySelector('.node-panel-overlay');
  const panel = document.querySelector('.node-panel');
  const panelTitle = document.querySelector('.node-panel-title');
  const panelType = document.querySelector('.node-panel-type');
  const panelClose = document.querySelector('.node-panel-close');
  const panelBody = document.querySelector('.node-panel-body');
  const prevGroup = document.querySelector('.node-nav-group.prev');
  const nextGroup = document.querySelector('.node-nav-group.next');
  const allContents = panelBody.querySelectorAll('.node-panel-content');

  // main flow 的上一個／下一個節點（排除 ai_languageModel 這種輔助連線）
  // 一個節點可能有多條分支（例如 Switch / If），所以回傳陣列，而不是只取第一條
  function findAdjacent(id) {
    return {
      next: DIAGRAM_EDGES.filter((e) => e.from === id && e.kind !== 'model'),
      prev: DIAGRAM_EDGES.filter((e) => e.to === id && e.kind !== 'model'),
    };
  }

  const BRANCH_LABELS = {
    image: '🖼️ 圖片路徑',
    text: '🤖 文字路徑',
    true: '✅ 記帳路徑',
    false: '📊 查詢路徑',
  };

  function renderNavGroup(container, edges, dir) {
    container.innerHTML = '';
    const baseLabel = dir === 'prev' ? '← 上一個節點' : '下一個節點 →';

    if (edges.length === 0) {
      const btn = document.createElement('button');
      btn.className = `node-nav-btn ${dir}`;
      btn.disabled = true;
      btn.innerHTML = `<span class="nn-label">${baseLabel}</span><span class="nn-name">—</span>`;
      container.appendChild(btn);
      return;
    }

    edges.forEach((edge) => {
      const target = nodeById[dir === 'prev' ? edge.from : edge.to];
      if (!target) return;
      const branch = edge.label ? BRANCH_LABELS[edge.label] || edge.label : '';
      const label = branch ? `${baseLabel}（${branch}）` : baseLabel;
      const btn = document.createElement('button');
      btn.className = `node-nav-btn ${dir}`;
      btn.innerHTML = `<span class="nn-label">${label}</span><span class="nn-name">${target.icon} ${target.label}</span>`;
      btn.onclick = () => openPanel(target.id);
      container.appendChild(btn);
    });
  }

  function openPanel(id) {
    const node = nodeById[id];
    if (!node) return;

    allContents.forEach((c) => {
      c.hidden = c.dataset.node !== id;
    });

    panelTitle.textContent = `${node.icon} ${node.label}`;
    panelType.textContent = node.type;

    const { prev, next } = findAdjacent(id);
    renderNavGroup(prevGroup, prev, 'prev');
    renderNavGroup(nextGroup, next, 'next');

    document.querySelectorAll('.diagram-node').forEach((d) => d.classList.toggle('active', d.dataset.node === id));

    panelBody.scrollTop = 0;
    overlay.classList.add('open');
    panel.classList.add('open');
  }

  function closePanel() {
    overlay.classList.remove('open');
    panel.classList.remove('open');
  }

  overlay.addEventListener('click', closePanel);
  panelClose.addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });
})();
