# Генерация images/og-image.jpg (1200x630) из hero-фото для Open Graph.
# Прежний og:image указывал на несуществующий hero-desktop.jpg (404).
# Требует: pip install Pillow
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = Image.open(os.path.join(ROOT, 'images', 'hero-desktop.webp')).convert('RGB')

TW, TH = 1200, 630
scale = max(TW / src.width, TH / src.height)
resized = src.resize((round(src.width * scale), round(src.height * scale)), Image.LANCZOS)
left = (resized.width - TW) // 2
top = (resized.height - TH) // 2
out = os.path.join(ROOT, 'images', 'og-image.jpg')
resized.crop((left, top, left + TW, top + TH)).save(out, 'JPEG', quality=85, optimize=True, progressive=True)
print('og-image.jpg:', os.path.getsize(out) // 1024, 'KB')
