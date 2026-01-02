# app/settings/render.py
import re
from typing import Any, Dict

_token_pattern = re.compile(r"\{([a-zA-Z0-9_]+)\}")

def render_template(text: str, data: Dict[str, Any]) -> str:
    def repl(m):
        k = m.group(1)
        v = data.get(k)
        return "" if v is None else str(v)
    return _token_pattern.sub(repl, text or "")
