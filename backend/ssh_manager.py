"""
SSH Manager — handles all SSH interactions with network devices.
Uses netmiko for multi-vendor support.
"""
import traceback
from netmiko import ConnectHandler, NetmikoTimeoutException, NetmikoAuthenticationException

from parsers import mikrotik, ruijie, ruckus, unifi

# maps brand name to netmiko device_type
BRAND_DEVICE_TYPE = {
    "mikrotik": "mikrotik_routeros",
    "ruijie": "ruijie_os",
    "ruckus": "terminal_server",
    "unifi": "linux",
}

# maps brand name to its parser module
BRAND_PARSER = {
    "mikrotik": mikrotik,
    "ruijie": ruijie,
    "ruckus": ruckus,
    "unifi": unifi,
}


def build_connection_params(device):
    """Build netmiko connection dict from our device record."""
    brand = device["brand"]
    device_type = BRAND_DEVICE_TYPE.get(brand, "linux")

    params = {
        "device_type": device_type,
        "host": device["ip"],
        "port": device.get("port", 22),
        "username": device["username"],
        "password": device["password"],
        "timeout": 15,
        "auth_timeout": 15,
        "banner_timeout": 15,
    }

    # mikrotik sometimes needs special handling
    if brand == "mikrotik":
        params["global_delay_factor"] = 2

    return params


def poll_device(device):
    """
    Connect to device via SSH, run status commands, parse output.
    Returns: { "status": "online"/"offline", "uptime": ..., "cpu_percent": ..., "ram_percent": ..., "extra": {} }
    """
    brand = device["brand"]
    parser_module = BRAND_PARSER.get(brand)

    if not parser_module:
        return {"status": "unknown", "error": f"No parser for brand: {brand}"}

    try:
        params = build_connection_params(device)
        conn = ConnectHandler(**params)

        combined_metrics = {
            "status": "online",
            "uptime": None,
            "cpu_percent": None,
            "ram_percent": None,
            "extra": {},
        }

        for command in parser_module.POLL_COMMANDS:
            output = conn.send_command(command, read_timeout=10)
            parser_fn = parser_module.PARSER_MAP.get(command)

            if parser_fn:
                result = parser_fn(output)
                if result.get("uptime"):
                    combined_metrics["uptime"] = result["uptime"]
                if result.get("cpu_percent") is not None:
                    combined_metrics["cpu_percent"] = result["cpu_percent"]
                if result.get("ram_percent") is not None:
                    combined_metrics["ram_percent"] = result["ram_percent"]
                if result.get("extra"):
                    combined_metrics["extra"].update(result["extra"])

        conn.disconnect()
        return combined_metrics

    except NetmikoTimeoutException:
        return {"status": "offline", "error": "Connection timed out"}
    except NetmikoAuthenticationException:
        return {"status": "auth_error", "error": "Authentication failed"}
    except Exception as e:
        return {"status": "error", "error": str(e), "trace": traceback.format_exc()}


def restart_device(device):
    """
    Connect to device and execute the vendor-specific restart command.
    Returns: { "success": bool, "output": str, "error": str|None }
    """
    brand = device["brand"]
    parser_module = BRAND_PARSER.get(brand)

    if not parser_module:
        return {"success": False, "output": "", "error": f"No parser for brand: {brand}"}

    try:
        params = build_connection_params(device)
        conn = ConnectHandler(**params)

        restart_cmd = parser_module.RESTART_COMMAND

        # some restart commands need confirmation — send_command_timing handles prompts
        output = conn.send_command_timing(restart_cmd, read_timeout=10)

        try:
            conn.disconnect()
        except Exception:
            pass  # device is rebooting, connection may drop

        return {"success": True, "output": output, "error": None}

    except NetmikoTimeoutException:
        return {"success": False, "output": "", "error": "Connection timed out"}
    except NetmikoAuthenticationException:
        return {"success": False, "output": "", "error": "Authentication failed"}
    except Exception as e:
        return {"success": False, "output": "", "error": str(e)}
