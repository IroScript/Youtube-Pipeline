"""
V4 Deep Male Voice Generator — OmniVoice Focus
================================================
সব OmniVoice voice + HD model দিয়ে 14টি sample generate।
সবচেয়ে human-like deep male voice খোঁজা হচ্ছে।

ব্যবহার: python generate_v4_deep_male_voice_all.py <PORT>
"""
import paramiko, os, sys, importlib.util

HOST = "bore.pub"
USER = "root"
PASSWORD = "omnivoice123"
ENV = "export LD_LIBRARY_PATH=/usr/lib64-nvidia:/usr/local/cuda-12.8/lib64:/usr/local/cuda-12.8/compat:$LD_LIBRARY_PATH && export PATH=$HOME/.local/bin:$PATH && "
LOCAL_BASE = r"C:\Users\Irak\Desktop\Youtube Pipeline\google colab"

def get_script(path):
    spec = importlib.util.spec_from_file_location("mod", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.SCRIPT

def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 65426
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=port, username=USER, password=PASSWORD, timeout=15)
    print(f"SSH Connected to bore.pub:{port}")
    sftp = client.open_sftp()
    
    # Check OmniVoice server
    _, o, _ = client.exec_command(ENV + "curl -sf http://localhost:3900/health", timeout=10)
    health = o.read().decode().strip()
    if "ok" not in health:
        print("OmniVoice server cholche na!")
        client.close()
        return
    
    print(f"OmniVoice: {health}")
    
    # Upload and run
    print(f"\n{'='*60}")
    print("  OmniVoice v4 — Deep Male Voice (14 samples)")
    print(f"{'='*60}")
    
    script = get_script(os.path.join(LOCAL_BASE, "omnivoice", "v4_deep_male_voice_omnivoice.py"))
    with sftp.open("/content/omnivoice/gen_omnivoice_v4.py", "w") as f:
        f.write(script)
    
    _, o, e = client.exec_command(ENV + "cd /content/omnivoice && python3 gen_omnivoice_v4.py", timeout=600)
    out = o.read().decode().strip()
    if out: print(out)
    
    # Download all v4 files
    local_dir = os.path.join(LOCAL_BASE, "omnivoice")
    try:
        for f_name in sftp.listdir("/content/omnivoice/omnivoice/"):
            if f_name.startswith("v4_"):
                sftp.get(f"/content/omnivoice/omnivoice/{f_name}", os.path.join(local_dir, f_name))
                size = os.path.getsize(os.path.join(local_dir, f_name))
                print(f"  Downloaded: {f_name} ({size//1024} KB)")
    except Exception as ex:
        print(f"  Download error: {ex}")
    
    sftp.close()
    client.close()
    print(f"\n{'='*60}")
    print("  V4 DEEP MALE VOICE TEST COMPLETE!")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
