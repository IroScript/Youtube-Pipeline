"""SSH helper to run commands on Colab via bore.pub"""
import paramiko
import sys

HOST = "bore.pub"
USER = "root"
PASSWORD = "omnivoice123"

def run_on_colab(commands, port):
    """Run a list of commands on Colab and print output."""
    ENV = "export LD_LIBRARY_PATH=/usr/lib64-nvidia:/usr/local/cuda-12.8/lib64:/usr/local/cuda-12.8/compat:$LD_LIBRARY_PATH && export PATH=$HOME/.local/bin:$PATH && "
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=port, username=USER, password=PASSWORD, timeout=15)
    
    for cmd in commands:
        stdin, stdout, stderr = client.exec_command(ENV + cmd, timeout=120)
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        if out:
            print(out)
        if err and 'WARNING' not in err and 'FutureWarning' not in err:
            print(f"[stderr] {err}")
    
    client.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python colab_ssh.py <PORT> [command]")
        print("Example: python colab_ssh.py 11957 'nvidia-smi'")
        sys.exit(1)
    
    port = int(sys.argv[1])
    if len(sys.argv) > 2:
        run_on_colab([" ".join(sys.argv[2:])], port)
    else:
        # Default: environment check
        run_on_colab([
            "curl -sf http://localhost:3900/health || echo 'OmniVoice not running'",
            "nvidia-smi --query-gpu=name,memory.free --format=csv,noheader 2>/dev/null || echo 'nvidia-smi needs LD_LIBRARY_PATH'",
            "free -h | head -2",
        ], port)
