"""Cuts the pitch video: stills with slow zooms, the voiceover per section, burned-in captions.

Run from this folder: python -I build.py <path to docs/video-script.md> <output dir>
"""
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT, OUTDIR = sys.argv[1], sys.argv[2]
FPS = 30
LEAD, PAD, TAIL = 0.3, 0.6, 1.5  # silence before each voice line, after it, after the last one


def run(args):
    subprocess.run(args, check=True, cwd=HERE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def dur(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                         capture_output=True, text=True, cwd=HERE, check=True).stdout
    return float(out)


# Shots per section: (image, share of the section, zoom focus x, y, end zoom).
SECTIONS = [
    [("c_t1", 0.2, .5, .5, 1.03), ("c_t2", 0.25, .5, .5, 1.03), ("l_home_stats", 0.55, .5, .5, 1.08)],
    [("l_home_top", 1.0, .35, .3, 1.06)],
    [("l_queue_5k", 0.5, .3, .6, 1.05), ("l_queue_30k", 0.5, .3, .6, 1.05)],
    [("f_borrow_0", 0.1, .5, .5, 1.0), ("f_borrow_1", 0.14, .3, .45, 1.02), ("f_borrow_2", 0.76, .72, .45, 1.18)],
    [("f_lab_0", 0.28, .7, .5, 1.08), ("f_lab_table_after", 0.4, .5, .25, 1.1), ("f_loan_after", 0.32, .3, .5, 1.12)],
    [("l_absorb", 0.55, .7, .55, 1.08), ("f_proof", 0.45, .5, .55, 1.06)],
    [("c_arch", 0.52, .5, .45, 1.04), ("c_tested", 0.48, .5, .45, 1.04)],
    [("c_next", 0.45, .5, .45, 1.04), ("c_end", 0.55, .5, .5, 1.03)],
]

# Every shot from the local fork carries this label, whatever the zoom crops.
FORK_BADGE = (",drawtext=fontfile='C\:/Windows/Fonts/segoeuib.ttf':text='Local fork of Mezo testnet':fontsize=30"
              ":fontcolor=0x5a3b00:box=1:boxcolor=0xfff4d6:boxborderw=16:x=w-tw-56:y=44")

vo = [os.path.join("vo", f"vo_{i}.wav") for i in range(len(SECTIONS))]
lengths = [LEAD + dur(os.path.join(HERE, v)) + PAD for v in vo]
lengths[-1] += TAIL
os.makedirs(os.path.join(HERE, "clips"), exist_ok=True)

# 1. One clip per shot.
clips = []
for s, shots in enumerate(SECTIONS):
    for k, (img, share, fx, fy, zend) in enumerate(shots):
        d = lengths[s] * share
        n = max(1, round(d * FPS))
        z = f"1+({zend}-1)*on/{n}"
        x = f"(iw-iw/zoom)*{fx}"
        y = f"(ih-ih/zoom)*{fy}"
        out = os.path.join("clips", f"s{s}_{k}.mp4")
        run(["ffmpeg", "-y", "-v", "error", "-loop", "1", "-i", os.path.join("shots", img + ".png"),
             "-vf", f"scale=3840:2160,zoompan=z='{z}':x='{x}':y='{y}':d={n}:s=1920x1080:fps={FPS}{FORK_BADGE if img.startswith('f_') else ''},format=yuv420p",
             "-frames:v", str(n), "-c:v", "libx264", "-crf", "18", "-preset", "medium", out])
        clips.append(out)

with open(os.path.join(HERE, "clips", "list.txt"), "w") as f:
    for c in clips:
        f.write(f"file '{os.path.basename(c)}'\n")
run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", os.path.join("clips", "list.txt"),
     "-c", "copy", "video_only.mp4"])

# 2. Audio: each voice line at its section start.
parts = []
for s, v in enumerate(vo):
    out = os.path.join("clips", f"a{s}.wav")
    run(["ffmpeg", "-y", "-v", "error", "-i", v, "-af",
         f"aresample=48000,adelay={int(LEAD * 1000)}:all=1,apad,atrim=0:{lengths[s]:.3f}", "-ac", "1", out])
    parts.append(out)
with open(os.path.join(HERE, "clips", "alist.txt"), "w") as f:
    for p in parts:
        f.write(f"file '{os.path.basename(p)}'\n")
run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", os.path.join("clips", "alist.txt"),
     "-c:a", "pcm_s16le", "voice.wav"])

# 3. Captions timed to where each voice line actually plays.
rows = [l for l in open(SCRIPT, encoding="utf8") if l.startswith("| ") and " to " in l.split("|")[1]]
texts = [[x.strip() for x in r.split("|")[1:-1]][2] for r in rows]


def ts(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


cues, start = [], 0.0
for s, text in enumerate(texts):
    v0, vlen = start + LEAD, dur(os.path.join(HERE, vo[s]))
    chunks = []
    for sentence in re.split(r"(?<=[.:;])\s+", text):
        cur = ""
        for w in sentence.split():
            if len(cur) + len(w) + 1 > 70 and cur:
                chunks.append(cur)
                cur = w
            else:
                cur = (cur + " " + w).strip()
        if cur:
            chunks.append(cur)
    weights = [len(c) for c in chunks]
    t = v0
    for c, w in zip(chunks, weights):
        d = vlen * w / sum(weights)
        cues.append((t, t + d, c))
        t += d
    start += lengths[s]
with open(os.path.join(HERE, "captions.srt"), "w", encoding="utf8", newline="\n") as f:
    for i, (a, b, c) in enumerate(cues, 1):
        f.write(f"{i}\n{ts(a)} --> {ts(b)}\n{c}\n\n")

# 4. Mux and burn captions.
style = ("Fontname=Arial,Fontsize=13,PrimaryColour=&H00F7F5F4,OutlineColour=&H30161219,BackColour=&H30161219,"
         "BorderStyle=3,Outline=6,Shadow=0,MarginV=24,Alignment=2")
os.makedirs(OUTDIR, exist_ok=True)
final = os.path.join(OUTDIR, "frontline-pitch.mp4")
run(["ffmpeg", "-y", "-v", "error", "-i", "video_only.mp4", "-i", "voice.wav",
     "-vf", f"subtitles=captions.srt:force_style='{style}'",
     "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-c:a", "aac", "-b:a", "160k",
     "-shortest", "-movflags", "+faststart", final])
print("total", round(sum(lengths), 2), "s ->", final)
