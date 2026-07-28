# ============================================================
# সেল ১: এটি সবার আগে রান করুন (প্যাকেজ ইনস্টল)
# ============================================================
# !pip install -q -U diffusers transformers accelerate bitsandbytes

# ============================================================
# সেল ২: GPU মেমোরি ক্লিনআপ (আগের প্রসেস থাকলে মুছে দেবে)
# ============================================================
# import torch
# import gc
# torch.cuda.empty_cache()
# gc.collect()
# print("✅ GPU মেমোরি ক্লিয়ার হয়েছে!")
# !nvidia-smi

# ============================================================
# সেল ৩: মূল ভিডিও জেনারেশন কোড
# ============================================================
import torch
import gc
from diffusers import HunyuanVideoPipeline, HunyuanVideoTransformer3DModel
from transformers import BitsAndBytesConfig, LlamaModel
from diffusers.utils import export_to_video

# GPU মেমোরি নিশ্চিতভাবে ক্লিয়ার
torch.cuda.empty_cache()
gc.collect()

# 4-bit Quantization কনফিগারেশন
quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_quant_type="nf4"
)

# Text Encoder (LLaMA ~8B) কে 4-bit করে GPU 0 তে লোড
text_encoder = LlamaModel.from_pretrained(
    "hunyuanvideo-community/HunyuanVideo",
    subfolder="text_encoder",
    quantization_config=quantization_config,
    torch_dtype=torch.float16,
    device_map={"": "cuda:0"}
)
print("✅ Text Encoder লোড হয়েছে (GPU 0)")

# Transformer (~13B) কে 4-bit করে GPU 1 তে লোড
transformer = HunyuanVideoTransformer3DModel.from_pretrained(
    "hunyuanvideo-community/HunyuanVideo",
    subfolder="transformer",
    quantization_config=quantization_config,
    torch_dtype=torch.float16,
    device_map={"": "cuda:1"}
)
print("✅ Transformer লোড হয়েছে (GPU 1)")

# পাইপলাইন লোড
pipe = HunyuanVideoPipeline.from_pretrained(
    "hunyuanvideo-community/HunyuanVideo",
    text_encoder=text_encoder,
    transformer=transformer,
    torch_dtype=torch.float16,
)
print("✅ Pipeline লোড হয়েছে")

# VAE অপটিমাইজেশন
pipe.vae.enable_tiling()
pipe.vae.enable_slicing()

# ভিডিও জেনারেট
prompt = "A majestic lion standing on a mountain peak at sunset, realistic style, 4k"
output = pipe(prompt=prompt, num_frames=17, num_inference_steps=20).frames[0]
export_to_video(output, "output_video.mp4", fps=15)
print("✅ ভিডিও সফলভাবে তৈরি হয়েছে!")
