import * as THREE from 'three';

// 自製像素皮膚：低對比膚色斑塊與藍綠衣袖，保留清楚的方形像素。
export function pixelTexture(palette, rows) {
  const size = rows.length;
  const pixels = new Uint8Array(size * size * 4);
  rows.forEach((row, y) => [...row].forEach((index, x) => {
    const hex = palette[Number(index)];
    const offset = (y * size + x) * 4;
    pixels.set([(hex >> 16) & 255, (hex >> 8) & 255, hex & 255, 255], offset);
  }));
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createHandTextures() {
  return {
    skin: pixelTexture([0xb98568, 0xbd8b6e, 0xc39377, 0xb38064], [
      '11112211', '11112211', '01111111', '00111122',
      '11111122', '11100111', '31100111', '33111111',
    ]),
    sleeve: pixelTexture([0x00989e, 0x00a5ab, 0x00afb5, 0x008d94], [
      '11111111', '11122111', '11122111', '01111111',
      '00111111', '00111100', '11111100', '31111111',
    ]),
  };
}
