"""Install and run OmniVoice Studio backend on Colab"""
import paramiko
import os

HOST = "bore.pub"
PORT = 11957
USER = "root"
PASSWORD = "omnivoice123"
ENV = "export LD_LIBRARY_PATH=/usr/lib64-nvidia:/usr/local/cuda-12.8/lib64:/usr/local/cuda-12.8/compat:$LD_LIBRARY_PATH && "

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=15)
print("SSH Connected!")

def run(cmd, timeout=300):
    _, o, e = client.exec_command(ENV + cmd, timeout=timeout)
    out = o.read().decode().strip()
    err = e.read().decode().strip()
    if out:
        print(out)
    if err:
        important = [l for l in err.split('\n') if any(x in l.lower() for x in ['error', 'fatal', 'exception']) and 'warning' not in l.lower() and 'deprecat' not in l.lower()]
        if important:
            for l in important[:5]:
                print(f"[err] {l}")
    return out

# Step 1: Check pyproject.toml for deps
print("[1/6] Dependencies dekhchi...")
run("cat /content/omnivoice-studio/pyproject.toml | head -50")

# Step 2: Check backend main.py
print("\n[2/6] Backend structure dekhchi...")
run("head -40 /content/omnivoice-studio/backend/main.py")
run("ls /content/omnivoice-studio/backend/engines/")

# Step 3: Install uv
print("\n[3/6] uv install korchi...")
run("curl -LsSf https://astral.sh/uv/install.sh | sh 2>&1 | tail -3")
run("export PATH=$HOME/.local/bin:$PATH && uv --version")

# Step 4: Install OmniVoice dependencies
print("\n[4/6] OmniVoice dependencies install korchi (2-3 min)...")
run("export PATH=$HOME/.local/bin:$PATH && cd /content/omnivoice-studio && uv sync 2>&1 | tail -10", timeout=600)

# Step 5: Run setup script
print("\n[5/6] Setup script cholchi...")
run("export PATH=$HOME/.local/bin:$PATH && cd /content/omnivoice-studio && uv run python scripts/setup.py 2>&1 | tail -10", timeout=300)

# Step 6: Start backend server in background
print("\n[6/6] OmniVoice backend server start korchi...")
run("export PATH=$HOME/.local/bin:$PATH && cd /content/omnivoice-studio && nohup uv run python backend/main.py > /tmp/omnivoice.log 2>&1 &")
import time
time.sleep(8)

# Check if server is running
print("\n=== Server status ===")
run("curl -sf http://localhost:3900/health 2>&1 || curl -sf http://localhost:3900/system/info 2>&1 || echo 'Server not ready yet'")
run("cat /tmp/omnivoice.log | tail -15")

client.close()
print("\nSetup script complete!")
