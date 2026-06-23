function drawRadarChart(canvas, dimensions, options = {}) {
  if (!canvas || !dimensions || dimensions.length === 0) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const displayWidth = options.width || canvas.clientWidth || 340;
  const displayHeight = options.height || canvas.clientHeight || 300;

  canvas.width = displayWidth * dpr;
  canvas.height = displayHeight * dpr;
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';
  ctx.scale(dpr, dpr);

  const padding = options.padding || 50;
  const cx = displayWidth / 2;
  const cy = displayHeight / 2;
  const radius = Math.min(displayWidth, displayHeight) / 2 - padding;

  const count = dimensions.length;
  const angleStep = (Math.PI * 2) / count;
  const startAngle = -Math.PI / 2;

  const maxValue = options.maxValue || 100;
  const levels = options.levels || 5;

  const bgColor = options.bgColor || 'rgba(26, 115, 232, 0.04)';
  const gridColor = options.gridColor || '#e8eaed';
  const axisColor = options.axisColor || '#dadce0';
  const dataColor = options.dataColor || '#1a73e8';
  const dataFillColor = options.dataFillColor || 'rgba(26, 115, 232, 0.15)';
  const labelColor = options.labelColor || '#333333';
  const labelSize = options.labelSize || 11;
  const dotColor = options.dotColor || '#1a73e8';

  const targetPoints = dimensions.map((dim) => {
    const value = Math.min(Math.max(dim.score || dim.value || 0, 0), maxValue);
    const r = (value / maxValue) * radius;
    const angle = startAngle + angleStep * dimensions.indexOf(dim);
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      label: dim.label || dim.name || '',
      value
    };
  });

  const enableAnimation = options.animation !== false;
  const duration = options.animationDuration || 800;

  function drawFrame(progress) {
    const eased = easeOutCubic(progress);

    ctx.clearRect(0, 0, displayWidth, displayHeight);

    for (let level = 1; level <= levels; level++) {
      const r = (radius / levels) * level;
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const angle = startAngle + angleStep * i;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      if (level === 1) {
        ctx.fillStyle = bgColor;
        ctx.fill();
      }
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    for (let i = 0; i < count; i++) {
      const angle = startAngle + angleStep * i;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.strokeStyle = axisColor;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    const animatedPoints = targetPoints.map((p) => ({
      x: cx + (p.x - cx) * eased,
      y: cy + (p.y - cy) * eased,
      label: p.label,
      value: Math.round(p.value * eased)
    }));

    ctx.beginPath();
    animatedPoints.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fillStyle = dataFillColor;
    ctx.fill();
    ctx.strokeStyle = dataColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    animatedPoints.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    ctx.fillStyle = labelColor;
    ctx.font = `${labelSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    targetPoints.forEach((p, i) => {
      const angle = startAngle + angleStep * i;
      const labelRadius = radius + 22;
      const lx = cx + Math.cos(angle) * labelRadius;
      const ly = cy + Math.sin(angle) * labelRadius;

      if (Math.abs(Math.cos(angle)) < 0.1) {
        ctx.textAlign = 'center';
      } else if (Math.cos(angle) > 0) {
        ctx.textAlign = 'left';
      } else {
        ctx.textAlign = 'right';
      }

      const label = p.label;
      const maxWidth = 70;
      if (ctx.measureText(label).width > maxWidth) {
        const halfLen = Math.floor(label.length / 2);
        const line1 = label.substring(0, halfLen);
        const line2 = label.substring(halfLen);
        ctx.fillText(line1, lx, ly - 6);
        ctx.fillText(line2, lx, ly + 6);
      } else {
        ctx.fillText(label, lx, ly);
      }
    });
  }

  if (enableAnimation) {
    const startTime = performance.now();
    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      drawFrame(progress);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }
    requestAnimationFrame(animate);
  } else {
    drawFrame(1);
  }
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export { drawRadarChart };
