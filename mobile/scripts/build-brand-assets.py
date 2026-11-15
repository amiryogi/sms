"""
Build the app's brand images from the two source files in assets/brand/source/.

    python -I scripts/build-brand-assets.py      (needs Pillow: pip install pillow)

Outputs (assets/brand/ unless noted), all transparent PNGs:
  arc.png, cap.png, body.png   the emblem split into layers on ONE shared canvas, so they
                               stack exactly; the intro animates them (BrandIntro.tsx)
  mark.png                     the three layers together (the emblem)
  wordmark.png, sms.png,       "Vidyalaya", "SMS" and its two rules, at the same scale as
  rules.png                    the emblem; sms.png and rules.png share a canvas
  logo.png                     the whole lockup, trimmed
  waves.png                    the welcome screen's waves, white turned into transparency
  ../splash-icon.png           body.png centred on a square: the native splash shows the book
                               and student, and the intro starts from exactly that picture
  ../notification-icon.png     the emblem as a white silhouette, for Android notifications
Sizes are written to src/features/brand/brandAssets.json for the layout maths.
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "brand", "source")
OUT = os.path.join(ROOT, "assets", "brand")

EMBLEM_BOTTOM = 620  # source rows above this are the emblem; below, the words
WORD_SPLIT = 822  # "Vidyalaya" above, "SMS" and its rules below
NOISE_ALPHA = 12  # source pixels at or below this alpha are dropped
EMBLEM_WIDTH = 720  # output width of the emblem canvas (px); everything shares its scale


def color_to_alpha_white(im):
    """GIMP's colour-to-alpha against white: the same picture over white, transparent elsewhere."""
    im = im.convert("RGB")
    out = Image.new("RGBA", im.size)
    src, dst = im.load(), out.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b = src[x, y]
            a = max(255 - r, 255 - g, 255 - b) / 255
            if a < 0.04:
                dst[x, y] = (0, 0, 0, 0)
                continue
            un = lambda c: max(0, min(255, round(255 - (255 - c) / a)))
            dst[x, y] = (un(r), un(g), un(b), round(a * 255))
    return out


def main():
    logo = Image.open(os.path.join(SRC, "logo-source.png")).convert("RGBA")
    px = logo.load()
    w, h = logo.size

    arc = Image.new("RGBA", logo.size)
    cap = Image.new("RGBA", logo.size)
    body = Image.new("RGBA", logo.size)
    words = Image.new("RGBA", logo.size)
    sms = Image.new("RGBA", logo.size)
    rules = Image.new("RGBA", logo.size)
    a_px, c_px, b_px, w_px, s_px, r_px = (i.load() for i in (arc, cap, body, words, sms, rules))

    head_cx, head_cy, head_r = 768, 320, 52
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            if p[3] <= NOISE_ALPHA:  # faint residue of the source's background removal
                continue
            if y < EMBLEM_BOTTOM:
                orange = p[0] > 150 and p[0] > p[2] + 60
                in_head = (x - head_cx) ** 2 + (y - head_cy) ** 2 < head_r**2
                is_cap = 630 <= x <= 900 and y < 312 and not in_head and (y < 290 or x >= 855)
                (a_px if orange else c_px if is_cap else b_px)[x, y] = p
            elif y < WORD_SPLIT:
                w_px[x, y] = p
            elif x < 565 or x > 975:
                r_px[x, y] = p
            else:
                s_px[x, y] = p

    def union_bbox(*images):
        boxes = [i.getbbox() for i in images if i.getbbox()]
        return (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))

    emblem_box = union_bbox(arc, cap, body)
    scale = EMBLEM_WIDTH / (emblem_box[2] - emblem_box[0])

    def save(im, box, name):
        crop = im.crop(box)
        size = (round(crop.width * scale), round(crop.height * scale))
        crop = crop.resize(size, Image.LANCZOS)
        crop.save(os.path.join(OUT, name), optimize=True)
        return {"width": size[0], "height": size[1]}

    sizes = {}
    for im, name in ((arc, "arc.png"), (cap, "cap.png"), (body, "body.png")):
        sizes[name[:-4]] = save(im, emblem_box, name)
    mark = Image.alpha_composite(Image.alpha_composite(body, cap), arc)
    sizes["mark"] = save(mark, emblem_box, "mark.png")
    # The native splash: the body on a square canvas, the emblem canvas centred on it (the
    # splash plugins fit the image in a square). BrandIntro starts from this exact picture.
    body_png = Image.open(os.path.join(OUT, "body.png"))
    square = Image.new("RGBA", (body_png.width, body_png.width))
    square.alpha_composite(body_png, (0, (body_png.width - body_png.height) // 2))
    square.save(os.path.join(ROOT, "assets", "splash-icon.png"), optimize=True)

    # Android status-bar icon for push notifications: the emblem as a white silhouette
    # (Android draws only the alpha channel), 96 px square.
    mark_png = Image.open(os.path.join(OUT, "mark.png"))
    white = Image.new("RGBA", mark_png.size, (255, 255, 255, 0))
    white.putalpha(mark_png.getchannel("A"))
    white.thumbnail((88, 88), Image.LANCZOS)
    icon = Image.new("RGBA", (96, 96))
    icon.alpha_composite(white, ((96 - white.width) // 2, (96 - white.height) // 2))
    icon.save(os.path.join(ROOT, "assets", "notification-icon.png"), optimize=True)

    sizes["wordmark"] = save(words, words.getbbox(), "wordmark.png")
    sms_box = union_bbox(sms, rules)
    sizes["sms"] = save(sms, sms_box, "sms.png")
    save(rules, sms_box, "rules.png")
    whole = Image.alpha_composite(Image.alpha_composite(Image.alpha_composite(mark, words), sms), rules)
    whole_box = whole.getbbox()
    sizes["logo"] = save(whole, whole_box, "logo.png")
    # Where each part sits inside logo.png (px at output scale), to rebuild the lockup.
    for name, box in (("mark", emblem_box), ("wordmark", words.getbbox()), ("sms", sms_box)):
        sizes[name]["x"] = round((box[0] - whole_box[0]) * scale)
        sizes[name]["y"] = round((box[1] - whole_box[1]) * scale)

    welcome = Image.open(os.path.join(SRC, "welcome-source.png"))
    band = welcome.crop((0, 1380, welcome.width, welcome.height))
    waves = color_to_alpha_white(band)
    waves = waves.crop((0, waves.getbbox()[1], waves.width, waves.height))
    waves.save(os.path.join(OUT, "waves.png"), optimize=True)
    sizes["waves"] = {"width": waves.width, "height": waves.height}

    with open(os.path.join(ROOT, "src", "features", "brand", "brandAssets.json"), "w") as f:
        json.dump(sizes, f, indent=2)
        f.write("\n")
    print(json.dumps(sizes))


if __name__ == "__main__":
    sys.exit(main())
