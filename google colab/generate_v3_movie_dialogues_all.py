"""
V3 Movie Dialogues Generator
==============================
Sholay (Hindi) + Ammajan (Bangla) + Gladiator (Hollywood)
সব AI থেকে v3 অডিও তৈরি।

ব্যবহার: python generate_v3_movie_dialogues_all.py <PORT>
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

def run_and_download(client, sftp, name, script_content, remote_dir, local_dir):
    print(f"\n{'='*60}")
    print(f"  {name} — v3 Movie Dialogues")
    print(f"{'='*60}")
    
    remote_script = f"/content/omnivoice/gen_{name}_v3.py"
    with sftp.open(remote_script, "w") as f:
        f.write(script_content)
    
    _, o, e = client.exec_command(ENV + f"cd /content/omnivoice && python3 {remote_script}", timeout=600)
    out = o.read().decode().strip()
    if out: print(out)
    err = e.read().decode().strip()
    if err:
        for l in err.split('\n'):
            if 'error' in l.lower() or 'exception' in l.lower():
                print(f"  [err] {l}")
                break
    
    os.makedirs(local_dir, exist_ok=True)
    try:
        for f_name in sftp.listdir(remote_dir):
            if f_name.startswith("v3_"):
                sftp.get(f"{remote_dir}/{f_name}", os.path.join(local_dir, f_name))
                size = os.path.getsize(os.path.join(local_dir, f_name))
                print(f"  Downloaded: {f_name} ({size//1024} KB)")
    except Exception as ex:
        print(f"  Download error: {ex}")

def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 11957
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=port, username=USER, password=PASSWORD, timeout=15)
    print(f"SSH Connected to bore.pub:{port}")
    sftp = client.open_sftp()
    
    run_and_download(client, sftp, "edge_tts",
        get_script(os.path.join(LOCAL_BASE, "edge_tts", "v3_movie_dialogues_edge_tts.py")),
        "/content/omnivoice/edge_tts", os.path.join(LOCAL_BASE, "edge_tts"))
    
    run_and_download(client, sftp, "bark_ai",
        get_script(os.path.join(LOCAL_BASE, "bark_ai", "v3_movie_dialogues_bark_ai.py")),
        "/content/omnivoice/bark_ai", os.path.join(LOCAL_BASE, "bark_ai"))
    
    _, o, _ = client.exec_command(ENV + "curl -sf http://localhost:3900/health", timeout=10)
    health = o.read().decode().strip()
    if "ok" in health:
        run_and_download(client, sftp, "omnivoice",
            get_script(os.path.join(LOCAL_BASE, "omnivoice", "v3_movie_dialogues_omnivoice.py")),
            "/content/omnivoice/omnivoice", os.path.join(LOCAL_BASE, "omnivoice"))
    else:
        print("\n⚠️ OmniVoice server cholche na!")
    
    sftp.close()
    client.close()
    print(f"\n{'='*60}")
    print("  ALL V3 MOVIE DIALOGUES COMPLETE!")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
