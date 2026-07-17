# Пережим изображений БЕЗ изменения пиксельных размеров.
# Критерий спеки: визуально без потерь. Файл перезаписывается только если
# новый вес меньше старого на 10%+. Для контроля сохраняются центральные
# кропы «до/после» в tmp-compare/ — просмотреть и удалить папку.
# Оригиналы остаются в git-истории.
import io
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CMP = os.path.join(ROOT, 'tmp-compare')
os.makedirs(CMP, exist_ok=True)


def crop_center(img, w=700, h=500):
    left = max(0, (img.width - w) // 2)
    top = max(0, (img.height - h) // 2)
    return img.crop((left, top, min(img.width, left + w), min(img.height, top + h)))


def compress(rel_path, fmt, **save_kwargs):
    full = os.path.join(ROOT, rel_path)
    old_size = os.path.getsize(full)
    img = Image.open(full)
    img.load()
    buf = io.BytesIO()
    img.save(buf, fmt, **save_kwargs)
    new_size = buf.tell()
    name = os.path.basename(rel_path)
    if new_size < old_size * 0.9:
        crop_center(img).save(os.path.join(CMP, name + '.before.png'))
        with open(full, 'wb') as f:
            f.write(buf.getvalue())
        crop_center(Image.open(full)).save(os.path.join(CMP, name + '.after.png'))
        print(f'{rel_path}: {old_size // 1024} КБ -> {new_size // 1024} КБ')
    else:
        print(f'{rel_path}: пропуск (выигрыш < 10%)')


compress('images/hero-desktop.webp', 'WEBP', quality=80, method=6)
compress('images/hero-mobile.jpg', 'JPEG', quality=82, optimize=True, progressive=True)

for fname in sorted(os.listdir(os.path.join(ROOT, 'collections'))):
    if fname.endswith('.webp'):
        rel = os.path.join('collections', fname)
        if os.path.getsize(os.path.join(ROOT, rel)) > 180 * 1024:
            compress(rel, 'WEBP', quality=80, method=6)
