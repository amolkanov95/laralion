# Генерация favicon-набора из images/logo.png (F-22).
# Логотип обрезается по непрозрачной области и вписывается в квадрат с отступом.
# Прозрачный фон для favicon/android; фоновый цвет бренда для apple-touch.
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'images', 'favicon')
os.makedirs(OUT, exist_ok=True)

BG = (252, 251, 249, 255)  # --bg-color #fcfbf9

src = Image.open(os.path.join(ROOT, 'images', 'logo.png')).convert('RGBA')
logo = src.crop(src.getbbox())  # убрать прозрачные поля
lw, lh = logo.size


def square(size, pad_ratio, bg=None):
    inner = int(size * (1 - 2 * pad_ratio))
    scale = min(inner / lw, inner / lh)
    nw, nh = max(1, round(lw * scale)), max(1, round(lh * scale))
    resized = logo.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), bg if bg else (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((size - nw) // 2, (size - nh) // 2))
    return canvas


square(16, 0.05).save(os.path.join(OUT, 'favicon-16x16.png'))
square(32, 0.05).save(os.path.join(OUT, 'favicon-32x32.png'))
square(180, 0.12, BG).convert('RGB').save(os.path.join(OUT, 'apple-touch-icon.png'))
square(192, 0.08).save(os.path.join(OUT, 'android-chrome-192x192.png'))
square(512, 0.08).save(os.path.join(OUT, 'android-chrome-512x512.png'))
square(256, 0.05).save(os.path.join(ROOT, 'favicon.ico'),
                       sizes=[(16, 16), (32, 32), (48, 48)])

print('OK favicons ->', OUT)
for f in ['favicon.ico']:
    p = os.path.join(ROOT, f)
    print(' ', f, os.path.getsize(p), 'bytes')
for f in sorted(os.listdir(OUT)):
    print('  images/favicon/' + f, os.path.getsize(os.path.join(OUT, f)), 'bytes')