import { BLOCK_ORDER, BLOCK_INFO } from './inventory.js';

const icons = import.meta.glob('../sky-island-assets/sky-island-assets/icons/*.png', { eager: true, query: '?url', import: 'default' });
export function createHotbar(inventory) {
  const bar = document.querySelector('#hotbar'), label = document.querySelector('#selected-item');
  const buttons = BLOCK_ORDER.map((type, index) => {
    const [name, icon] = BLOCK_INFO[type], button = document.createElement('button');
    button.type = 'button'; button.className = 'slot'; button.title = `${index + 1}：${name}`;
    button.dataset.type = type;
    const key = document.createElement('kbd'); key.textContent = index + 1;
    const image = document.createElement('img'); image.src = icons[`../sky-island-assets/sky-island-assets/icons/${icon}.png`]; image.alt = name;
    const count = document.createElement('span'); count.className = 'count'; count.textContent = '0';
    button.append(key, image, count);
    button.addEventListener('click', () => { inventory.select(type); update(); });
    bar.append(button);
    return { button, count, type, name };
  });
  let revision = -1;
  function update() {
    if (revision === inventory.revision) return;
    revision = inventory.revision;
    for (const slot of buttons) {
      const selected = inventory.selected === slot.type, count = inventory.count(slot.type);
      slot.button.classList.toggle('selected', selected);
      slot.button.setAttribute('aria-pressed', String(selected));
      slot.button.setAttribute('aria-label', `${slot.name}，${count} 個`);
      slot.count.textContent = count;
    }
    label.textContent = BLOCK_INFO[inventory.selected][0];
  }
  update();
  return { update };
}
