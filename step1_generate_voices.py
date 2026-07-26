"""
STEP 1: Generate all 10 voiceovers using REAL ChatTTS engine.
Each shot gets its own WAV file with actual human-like speech.
"""
import ChatTTS
import sys
import os
import torch
import soundfile as sf

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

VOICE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "voice")
os.makedirs(VOICE_DIR, exist_ok=True)

VOICEOVER_LINES = [
    (1,  "Beneath these rain-soaked, abandoned ruins... something has been hidden for centuries."),
    (2,  "A strange cosmic power capable of stopping time... calling out to me."),
    (3,  "And the moment I touched it... everything began!"),
    (4,  "In the blink of an eye, a lost golden empire was unveiled..."),
    (5,  "...where a grand machine controlled the birth and death of stars."),
    (6,  "Then I was lost in the depths of the ocean... in a world of magical light."),
    (7,  "Caught between reality and illusion... I became trapped."),
    (8,  "Shattering the boundaries of time and space... the portal opened!"),
    (9,  "There is no turning back... my journey into the unknown future begins."),
    (10, "The story doesn't end here... this is merely the echo of a new beginning."),
]

def main():
    print("=" * 65)
    print("STEP 1: ChatTTS Real Voice Generation (10 Shots)")
    print("=" * 65)

    # Load ChatTTS model ONCE
    chat = ChatTTS.Chat()
    print("Loading ChatTTS Model (one-time)...")
    chat.load(source="huggingface", compile=False)
    print("ChatTTS Model Loaded Successfully!")

    # Set consistent male narrator voice (seed 2222)
    torch.manual_seed(2222)
    spk = chat.sample_random_speaker()

    params_infer = ChatTTS.Chat.InferCodeParams(
        spk_emb=spk,
        prompt='[speed_3]'
    )
    params_refine = ChatTTS.Chat.RefineTextParams(
        prompt='[to_break_0]'
    )

    # Generate each shot voiceover one by one for reliability
    for shot_num, text in VOICEOVER_LINES:
        out_path = os.path.join(VOICE_DIR, f"shot_{shot_num:02d}_voiceover.wav")
        print(f"\n--- Shot {shot_num:02d} ---")
        print(f"Text: \"{text}\"")
        print("Generating speech...")

        wavs = chat.infer(
            [text],
            params_infer_code=params_infer,
            params_refine_text=params_refine
        )

        audio_data = wavs[0]
        if isinstance(audio_data, torch.Tensor):
            audio_data = audio_data.cpu().numpy()
        if len(audio_data.shape) > 1:
            audio_data = audio_data.squeeze()

        sf.write(out_path, audio_data, 24000)

        duration = len(audio_data) / 24000
        size_kb = os.path.getsize(out_path) / 1024
        print(f"SAVED: {out_path}")
        print(f"Duration: {duration:.2f}s | Size: {size_kb:.1f} KB")

    print("\n" + "=" * 65)
    print("ALL 10 ChatTTS VOICEOVERS GENERATED SUCCESSFULLY!")
    print(f"Output folder: {VOICE_DIR}")
    print("=" * 65)

if __name__ == "__main__":
    main()
