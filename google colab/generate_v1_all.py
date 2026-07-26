"""
V1 Sample Generator — সব AI থেকে v1 অডিও তৈরি
=================================================
Edge-TTS, Bark AI, OmniVoice — তিনটিই রান করে ডাউনলোড করে।

ব্যবহার: python generate_v1_all.py <PORT>
উদাহরণ: python generate_v1_all.py 11957
"""
import paramiko
import os
import sys
import importlib.util

HOST = "bore.pub"
USER = "root"
PASSWORD = "omnivoice123"
ENV = "export LD_LIBRARY_PATH=/usr/lib64-nvidia:/usr/local/cuda-12.8/lib64:/usr/local/cuda-12.8/compat:$LD_LIBRARY_PATH && export PATH=$HOME/.local/bin:$PATH && "

LOCAL_BASE = r"C:\Users\Irak\Desktop\Youtube Pipeline\google colab"

def get_script(module_path):
    """Load SCRIPT variable from a v1_*.py file."""
    spec = importlib.util.spec_from_file_location("mod", module_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.SCRIPT

def run_and_download(client, sftp, name, script_content, remote_dir, local_dir):
    """Upload script, run, download output."""
    print(f"\n{'='*60}")
    print(f"  {name}")
    print(f"{'='*60}")
    
    # Upload
    remote_script = f"/content/omnivoice/gen_{name}.py"
    with sftp.open(remote_script, "w") as f:
        f.write(script_content)
    
    # Run
    _, o, e = client.exec_command(ENV + f"cd /content/omnivoice && python3 {remote_script}", timeout=600)
    out = o.read().decode().strip()
    if out:
        print(out)
    err = e.read().decode().strip()
    if err:
        important = [l for l in err.split('\n') if 'error' in l.lower() or 'exception' in l.lower()]
        for l in important[:3]:
            print(f"  [err] {l}")
    
    # Download
    os.makedirs(local_dir, exist_ok=True)
    try:
        files = sftp.listdir(remote_dir)
        for f in files:
            if f.startswith("v1_"):
                remote_path = f"{remote_dir}/{f}"
                local_path = os.path.join(local_dir, f)
                sftp.get(remote_path, local_path)
                size = os.path.getsize(local_path)
                print(f"  Downloaded: {f} ({size//1024} KB)")
    except Exception as ex:
        print(f"  Download error: {ex}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_v1_all.py <PORT>")
        print("Example: python generate_v1_all.py 11957")
        sys.exit(1)
    
    port = int(sys.argv[1])
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=port, username=USER, password=PASSWORD, timeout=15)
    print(f"SSH Connected to bore.pub:{port}")
    sftp = client.open_sftp()
    
    # 1. Edge-TTS
    script1 = get_script(os.path.join(LOCAL_BASE, "edge_tts", "v1_edge_tts.py"))
    run_and_download(client, sftp, "edge_tts", script1,
                     "/content/omnivoice/edge_tts",
                     os.path.join(LOCAL_BASE, "edge_tts"))
    
    # 2. Bark AI
    script2 = get_script(os.path.join(LOCAL_BASE, "bark_ai", "v1_bark_ai.py"))
    run_and_download(client, sftp, "bark_ai", script2,
                     "/content/omnivoice/bark_ai",
                     os.path.join(LOCAL_BASE, "bark_ai"))
    
    # 3. OmniVoice (check server first)
    _, o, _ = client.exec_command(ENV + "curl -sf http://localhost:3900/health", timeout=10)
    health = o.read().decode().strip()
    if "ok" in health:
        script3 = get_script(os.path.join(LOCAL_BASE, "omnivoice", "v1_omnivoice.py"))
        run_and_download(client, sftp, "omnivoice", script3,
                         "/content/omnivoice/omnivoice",
                         os.path.join(LOCAL_BASE, "omnivoice"))
    else:
        print("\n⚠️ OmniVoice server cholche na! Age setup_omnivoice.py run korun.")
    
    sftp.close()
    client.close()
    print(f"\n{'='*60}")
    print("  ALL V1 SAMPLES COMPLETE!")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
