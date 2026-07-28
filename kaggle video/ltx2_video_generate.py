import torch
import gc

torch.cuda.empty_cache()
gc.collect()

print('Loading LTX-2.3 pipeline...')
from diffusers import LTX2Pipeline
from diffusers.pipelines.ltx2.export_utils import encode_video
from diffusers.pipelines.ltx2.utils import DEFAULT_NEGATIVE_PROMPT

pipe = LTX2Pipeline.from_pretrained(
    'diffusers/LTX-2.3-Diffusers', torch_dtype=torch.bfloat16
)
pipe.enable_model_cpu_offload()
print('Pipeline loaded')

print('Loading LoRA weights...')
pipe.load_lora_weights('Quantumbraid/ltx2-lora2', weight_name='lora_weights_step_02000.safetensors', adapter_name='lora')
pipe.set_adapters('lora', 1.0)
print('LoRA loaded')

prompt = 'A majestic lion standing on a mountain peak at golden sunset, cinematic lighting, realistic style, 4k'

print(f'Generating video: {prompt}')
video, audio = pipe(
    prompt=prompt,
    negative_prompt=DEFAULT_NEGATIVE_PROMPT,
    width=768, height=512, num_frames=49, frame_rate=25.0,
    num_inference_steps=30, guidance_scale=4.0,
    output_type='np', return_dict=False,
)

encode_video(video[0], fps=25.0, output_path='/content/output_ltx2.mp4')
print('Video saved to /content/output_ltx2.mp4')
