import { icons } from 'lucide';

/**
 * Render Lucide icon as SVG string for template interpolation.
 * @param {string} name - Lucide icon name (e.g. 'Shield', 'Activity')
 * @param {object} [options]
 * @param {number} [options.size=16]
 * @param {number} [options.strokeWidth=2]
 * @param {string} [options.className='']
 * @param {string} [options.color='currentColor']
 * @returns {string} SVG HTML string
 */
export function renderIcon(name, { size = 16, strokeWidth = 2, className = '', color = 'currentColor' } = {}) {
  const iconDef = icons[name] || icons.Shield;
  if (!iconDef) return '';

  const children = iconDef
    .map(([tag, attrs]) => {
      const attrStr = Object.entries(attrs)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');
      return `<${tag} ${attrStr}></${tag}>`;
    })
    .join('');

  const classAttr = className ? ` class="lucide lucide-${name.toLowerCase()} ${className}"` : ` class="lucide lucide-${name.toLowerCase()}"`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${classAttr}>${children}</svg>`;
}

/**
 * Render Lucide icon directly as a DOM element.
 */
export function createIconNode(name, options = {}) {
  const div = document.createElement('div');
  div.innerHTML = renderIcon(name, options);
  return div.firstElementChild;
}
