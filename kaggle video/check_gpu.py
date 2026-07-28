import torch
import gc

print(f"GPUs: {torch.cuda.device_count()}")
for i in range(torch.cuda.device_count()):
    name = torch.cuda.get_device_name(i)
    total = torch.cuda.get_device_properties(i).total_mem / 1e9
    print(f"  GPU {i}: {name} — {total:.1f}GB")

torch.cuda.empty_cache()
gc.collect()
print("Memory cleared")
