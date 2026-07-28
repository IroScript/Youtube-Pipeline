"""Run any command on Kaggle via SSH"""
import paramiko
import sys

HOST = "bore.pub"
PORT = 17054
USER = "root"
PASSWORD = "omnivoice123"
ENV = "export LD_LIBRARY_PATH=/usr/lib64-nvidia:/usr/local/cuda-12.8/lib64:/usr/local/cuda-12.8/compat:$LD_LIBRARY_PATH && export PATH=$HOME/.local/bin:$PATH && "

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=15)

cmd = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "echo connected"
_, stdout, stderr = client.exec_command(ENV + cmd, timeout=1800)
stdout.channel.settimeout(1800)
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
out = stdout.read().decode()
err = stderr.read().decode()
if out:
    print(out)
if err:
    for line in err.split('\n'):
        if 'WARNING' not in line and 'FutureWarning' not in line and line.strip():
            print(f"[stderr] {line}")
client.close()
