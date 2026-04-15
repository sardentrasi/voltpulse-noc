"""
Ruijie switch/AP CLI output parser.
Parses: show version, show cpu usage, show memory usage
Restart: reload
"""
import re


def parse_version(output):
    """Parse show version for uptime and model info."""
    metrics = {"uptime": None, "extra": {}}

    uptime_match = re.search(r'[Uu]ptime\s+is\s+(.+)', output)
    if uptime_match:
        metrics["uptime"] = uptime_match.group(1).strip()

    model_match = re.search(r'(RG-\S+|Ruijie\s+\S+)', output)
    if model_match:
        metrics["extra"]["model"] = model_match.group(1).strip()

    version_match = re.search(r'[Ss]oftware\s+[Vv]ersion\s*[:\s]\s*(.+)', output)
    if version_match:
        metrics["extra"]["version"] = version_match.group(1).strip()

    return metrics


def parse_cpu(output):
    """Parse show cpu usage output."""
    metrics = {"cpu_percent": None}

    # "CPU utilization for five seconds: 12%"  or "CPU Using Rate: 5%"
    cpu_match = re.search(r'(?:CPU\s+(?:utilization|[Uu]sing\s+[Rr]ate)).*?(\d+)\s*%', output)
    if cpu_match:
        metrics["cpu_percent"] = float(cpu_match.group(1))

    return metrics


def parse_memory(output):
    """Parse show memory usage output."""
    metrics = {"ram_percent": None, "extra": {}}

    # "Total(b): 262144000  Used(b): 131072000  Free(b): 131072000  Usage: 50%"
    usage_match = re.search(r'[Uu]sage:\s*(\d+)\s*%', output)
    if usage_match:
        metrics["ram_percent"] = float(usage_match.group(1))
        return metrics

    total_match = re.search(r'[Tt]otal.*?(\d+)', output)
    used_match = re.search(r'[Uu]sed.*?(\d+)', output)
    if total_match and used_match:
        total = int(total_match.group(1))
        used = int(used_match.group(1))
        if total > 0:
            metrics["ram_percent"] = round((used / total) * 100, 1)

    return metrics


POLL_COMMANDS = ["show version", "show cpu", "show memory"]
RESTART_COMMAND = "reload\ny"

PARSER_MAP = {
    "show version": parse_version,
    "show cpu": parse_cpu,
    "show memory": parse_memory,
}
