"""
NOC Device Parsers
Each parser module translates raw SSH CLI output into a standardized metrics dict.

Standard output format:
{
    "uptime": "3d 14h 22m",
    "cpu_percent": 12.5,
    "ram_percent": 45.2,
    "extra": { ... vendor-specific extras ... }
}
"""
