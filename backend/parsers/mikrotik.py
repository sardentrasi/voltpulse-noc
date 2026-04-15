"""
MikroTik RouterOS CLI output parser.
Parses: /system resource print
Restart: /system reboot
"""
import re


def parse_resource(output):
    """Parse /system resource print output into metrics dict."""
    metrics = {"uptime": None, "cpu_percent": None, "ram_percent": None, "extra": {}}

    # uptime: 3d14h22m35s
    uptime_match = re.search(r'uptime:\s*(.+)', output)
    if uptime_match:
        metrics["uptime"] = uptime_match.group(1).strip()

    # cpu-load: 12%
    cpu_match = re.search(r'cpu-load:\s*(\d+)', output)
    if cpu_match:
        metrics["cpu_percent"] = float(cpu_match.group(1))

    # total-memory: 262144000
    # free-memory: 134217728
    total_mem = re.search(r'total-memory:\s*(\d+)', output)
    free_mem = re.search(r'free-memory:\s*(\d+)', output)
    if total_mem and free_mem:
        total = int(total_mem.group(1))
        free = int(free_mem.group(1))
        if total > 0:
            used_percent = ((total - free) / total) * 100
            metrics["ram_percent"] = round(used_percent, 1)
            metrics["extra"]["ram_total_mb"] = round(total / 1024 / 1024, 1)
            metrics["extra"]["ram_free_mb"] = round(free / 1024 / 1024, 1)

    # board-name, version, architecture etc
    for field in ["board-name", "version", "architecture-name", "cpu", "cpu-count"]:
        match = re.search(rf'{field}:\s*(.+)', output)
        if match:
            metrics["extra"][field] = match.group(1).strip()

    return metrics


POLL_COMMANDS = ["/system resource print"]
RESTART_COMMAND = "/system reboot\ny"

PARSER_MAP = {
    "/system resource print": parse_resource,
}
