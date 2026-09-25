#!/usr/bin/env python3
"""
remote_exec.py - Ejecuta comandos en el servidor de produccion trust.supplymax.net (185.250.36.58).
"""
import sys
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
RUN_REMOTE = os.path.join(HERE, "run_remote.sh")

def main():
    if len(sys.argv) < 2:
        print("Uso: python3 remote_exec.py '<comando>'", file=sys.stderr)
        return 1
    cmd = sys.argv[1]
    proc = subprocess.run([RUN_REMOTE, cmd], capture_output=True, text=True)
    sys.stdout.write(proc.stdout)
    if proc.stderr:
        sys.stderr.write(proc.stderr)
    return proc.returncode

if __name__ == "__main__":
    sys.exit(main())
