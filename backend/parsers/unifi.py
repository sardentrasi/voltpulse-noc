"""
UniFi (Ubiquiti) device CLI output parser.
UniFi devices run Linux under the hood, so we use standard Linux commands.
Parses: cat /proc/uptime, top -bn1 | head -5, free -m
Restart: reboot
"""
import re


def parse_uptime(output):
    """Parse /proc/uptime — first value is total seconds up."""
    metrics = {"uptime": None}

    match = re.search(r'(\d+\.?\d*)', output)
    if match:
        total_seconds = int(float(match.group(1)))
        days = total_seconds // 86400
        hours = (total_seconds % 86400) // 3600
        minutes = (total_seconds % 3600) // 60

        parts = []
        if days > 0:
            parts.append(f"{days}d")
        if hours > 0:
            parts.append(f"{hours}h")
        parts.append(f"{minutes}m")
        metrics["uptime"] = " ".join(parts)

    return metrics


def parse_cpu(output):
    """Parse top output for CPU usage."""
    metrics = {"cpu_percent": None}

    # "CPU:   5% usr   2% sys   0% nic  92% idle" (busybox top)
    idle_match = re.search(r'(\d+)%\s*idle', output)
    if idle_match:
        idle = float(idle_match.group(1))
        metrics["cpu_percent"] = round(100.0 - idle, 1)
        return metrics

    # "%Cpu(s):  3.0 us,  1.0 sy,  0.0 ni, 96.0 id" (standard top)
    id_match = re.search(r'(\d+\.?\d*)\s*id', output)
    if id_match:
        idle = float(id_match.group(1))
        metrics["cpu_percent"] = round(100.0 - idle, 1)

    return metrics


def parse_memory(output):
    """Parse free -m output for RAM usage."""
    metrics = {"ram_percent": None, "extra": {}}

    # "Mem:   512   384   128 ..."
    mem_match = re.search(r'Mem:\s+(\d+)\s+(\d+)\s+(\d+)', output)
    if mem_match:
        total = int(mem_match.group(1))
        used = int(mem_match.group(2))
        if total > 0:
            metrics["ram_percent"] = round((used / total) * 100, 1)
            metrics["extra"]["ram_total_mb"] = total
            metrics["extra"]["ram_used_mb"] = used

    return metrics


POLL_COMMANDS = ["cat /proc/uptime", "top -bn1 | head -5", "free -m"]
RESTART_COMMAND = "reboot"

PARSER_MAP = {
    "cat /proc/uptime": parse_uptime,
    "top -bn1 | head -5": parse_cpu,
    "free -m": parse_memory,
}
