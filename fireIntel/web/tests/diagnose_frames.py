import os
import glob
from PIL import Image

frames = sorted(glob.glob("/Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/web/tests/transition_frames/frame_*.png"))
print(f"Total frames captured: {len(frames)}")

for idx, fpath in enumerate(frames):
    img = Image.open(fpath).convert("RGB")
    w, h = img.size
    center_crop = img.crop((w * 0.25, h * 0.25, w * 0.75, h * 0.75))
    pixels = list(center_crop.getdata())
    avg_r = sum(p[0] for p in pixels) / len(pixels)
    avg_g = sum(p[1] for p in pixels) / len(pixels)
    avg_b = sum(p[2] for p in pixels) / len(pixels)
    luminance = 0.299 * avg_r + 0.587 * avg_g + 0.114 * avg_b
    fname = os.path.basename(fpath)
    print(f"{fname:12s} | t={idx*150:4d}ms | Lum={luminance:6.2f} | RGB=({avg_r:5.1f}, {avg_g:5.1f}, {avg_b:5.1f})")

