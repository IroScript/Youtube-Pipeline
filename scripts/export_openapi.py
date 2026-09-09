"""
REQ-096: Export OpenAPI Contract Schema
=======================================
Exports complete OpenAPI 3.1 contract JSON for React/Vite ERP integration.
"""

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)

from apps.api.main import app

docs_dir = REPO_ROOT / "docs"
docs_dir.mkdir(parents=True, exist_ok=True)

contract = app.openapi()
contract_path = docs_dir / "openapi_contract.json"
contract_path.write_text(json.dumps(contract, indent=2), encoding="utf-8")

print(f"Exported OpenAPI specification ({len(contract.get('paths', {}))} endpoints) to {contract_path}")
