"""
Ruckus Wireless CLI output parser.
Parses: show sysinfo
Restart: reboot
"""
import re


def parse_sysinfo(output):
    """Parse show sysinfo output."""
    metrics = {"uptime": None, "cpu_percent": None, "ram_percent": None, "extra": {}}

    # "System Up Time:  3d:14h:22m:35s"
    uptime_match = re.search(r'[Uu]p\s*[Tt]ime.*?:\s*(.+)', output)
    if uptime_match:
        metrics["uptime"] = uptime_match.group(1).strip()

    # "CPU Utilization: 12%"
    cpu_match = re.search(r'CPU.*?(\d+)\s*%', output)
    if cpu_match:
        metrics["cpu_percent"] = float(cpu_match.group(1))

    # "Memory Utilization: 45%"  or parse from total/used
    mem_match = re.search(r'[Mm]emory.*?(\d+)\s*%', output)
    if mem_match:
        metrics["ram_percent"] = float(mem_match.group(1))
    else:
        total_match = re.search(r'[Tt]otal\s+[Mm]emory.*?(\d+)', output)
        used_match = re.search(r'[Uu]sed\s+[Mm]emory.*?(\d+)', output)
        if total_match and used_match:
            total = int(total_match.group(1))
            used = int(used_match.group(1))
            if total > 0:
                metrics["ram_percent"] = round((used / total) * 100, 1)

    # model, firmware
    model_match = re.search(r'[Mm]odel.*?:\s*(.+)', output)
    if model_match:
        metrics["extra"]["model"] = model_match.group(1).strip()

    fw_match = re.search(r'[Ff]irmware\s+[Vv]ersion.*?:\s*(.+)', output)
    if fw_match:
        metrics["extra"]["firmware"] = fw_match.group(1).strip()

    return metrics


POLL_COMMANDS = ["show sysinfo"]
RESTART_COMMAND = "reboot\ny"

PARSER_MAP = {
    "show sysinfo": parse_sysinfo,
}
