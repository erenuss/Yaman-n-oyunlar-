#!/usr/bin/env python3
"""Hayâl Perdesi replik seslerini üretir (Karagöz ve Hacivat, Türkçe erkek sesi).

Açık kaynak Piper TTS (MIT) + "dfki" Türkçe erkek ses modeli (veri: CC BY-NC-SA 4.0).
Aynı sesten iki karakter: Karagöz biraz kalın ve hızlı, Hacivat biraz ince ve ağırbaşlı.

Kurulum:
  pip install piper-tts
  curl -L -o tr_TR-dfki-medium.onnx      https://huggingface.co/rhasspy/piper-voices/resolve/main/tr/tr_TR/dfki/medium/tr_TR-dfki-medium.onnx
  curl -L -o tr_TR-dfki-medium.onnx.json https://huggingface.co/rhasspy/piper-voices/resolve/main/tr/tr_TR/dfki/medium/tr_TR-dfki-medium.onnx.json
Kullanım (depo kökünden):
  python3 scripts/hk-voices.py path/to/tr_TR-dfki-medium.onnx
Replikler hacivat-karagoz/dialogue.js içindedir; değiştirdikten sonra bu betiği yeniden çalıştırın.
"""
import json, os, subprocess, sys, tempfile, wave

from piper import PiperVoice, SynthesisConfig

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME = os.path.join(ROOT, 'hacivat-karagoz')
OUT = os.path.join(GAME, 'voices')

# karakter ayarları: konuşma hızı, ifade çeşitliliği, perde (yarım ton)
CHAR = {
    'k': dict(length_scale=.96, noise_scale=.667, noise_w_scale=.85, semitones=-1.2),  # Karagöz: kalın, hızlı, hareketli
    'h': dict(length_scale=1.02, noise_scale=.62, noise_w_scale=.75, semitones=1.6),  # Hacivat: ince, ağırbaşlı, kibar
}

# yazım -> telaffuz düzeltmeleri (yalnızca seslendirme için)
SAY = [('Yâr', 'Yaar'), ('â', 'a'), ('Â', 'A'), ('î', 'i'), ('û', 'u'), ('’', "'"), ('Sürç-i lisan', 'Sürçü lisan'), ('Hay Hak', 'Hay hak')]


def lines():
    js = ("import('" + os.path.join(GAME, 'dialogue.js').replace('\\', '/') + "').then(m => {"
          "const out = []; const add = (c, t) => out.push([c, t, m.voiceId(c, t)]);"
          "m.SCRIPT.forEach(([c, t]) => add(c, t));"
          "for (const c of ['k', 'h']) { m.OUCH[c].forEach(t => add(c, t)); m.HOP[c].forEach(t => add(c, t)); }"
          "console.log(JSON.stringify(out)); })")
    return json.loads(subprocess.run(['node', '--input-type=module', '-e', js], capture_output=True, text=True, check=True).stdout)


def main(model):
    voice = PiperVoice.load(model)
    os.makedirs(OUT, exist_ok=True)
    items, manifest = lines(), {}
    for code, text, vid in items:
        c = CHAR[code]
        say = text
        for a, b in SAY:
            say = say.replace(a, b)
        with tempfile.TemporaryDirectory() as td:
            raw = os.path.join(td, 'raw.wav')
            with wave.open(raw, 'wb') as wf:
                voice.synthesize_wav(say, wf, syn_config=SynthesisConfig(length_scale=c['length_scale'], noise_scale=c['noise_scale'], noise_w_scale=c['noise_w_scale']))
            pitch = 2 ** (c['semitones'] / 12)
            af = (f"rubberband=pitch={pitch:.4f}:formant=preserved,highpass=f=70,"
                  "silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_threshold=-45dB:stop_duration=0.25,"
                  "loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=0.08")
            out = os.path.join(OUT, vid + '.mp3')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', af, '-ar', '22050', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '48k', out], check=True)
        manifest[vid] = text
        print(f'{vid}.mp3  {code}  {text}')
    for f in os.listdir(OUT):  # artık kullanılmayan eski sesleri sil
        if f.endswith('.mp3') and f[:-4] not in manifest:
            os.remove(os.path.join(OUT, f))
    with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8') as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'tr_TR-dfki-medium.onnx')
