"""
REQ-002: Architectural Boundary Directory Structure & Layer Enforcement
========================================================================
Dedicated automated test suite proving:
1. Foundational Packages & Inits: All architectural packages exist with __init__.py.
2. Domain Layer Boundary: domain/ never imports from services/, repositories/, or apps/.
3. Repository Layer Boundary: repositories/ never imports from services/ or apps/.
4. Service Layer Boundary: services/ never imports from apps/.
5. API Router Boundary: apps/api/routers/ never imports from repositories/ directly (must use services/).
6. Infrastructure Boundary: infrastructure/ never imports from services/ or apps/.
7. Minimum File Count Assertion: Proves scanner processes all real source files without skipping.
8. Meta-Testing / Negative Injection (Test-of-the-Test): Proves scanner detects:
   - direct imports (import x)
   - from imports (from x import y)
   - aliased imports (import x as z)
   - relative imports (from ..x import y)
   - dynamic importlib calls (importlib.import_module('x'))
   - built-in dynamic imports (__import__('x'))
"""

import ast
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


def extract_all_imported_modules(file_path: Path, repo_root: Path = REPO_ROOT) -> list[tuple[int, str]]:
    """Extract all static and dynamic imported module paths from a Python file."""
    try:
        tree = ast.parse(file_path.read_text(encoding="utf-8"), filename=str(file_path))
    except Exception as e:
        pytest.fail(f"Failed to parse {file_path}: {e}")

    imports = []
    # Calculate package parts relative to repo_root
    rel_path = file_path.relative_to(repo_root)
    package_parts = list(rel_path.parent.parts)

    for node in ast.walk(tree):
        # 1. import foo, import foo.bar as baz
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append((node.lineno, alias.name))

        # 2. from foo import bar, from .foo import bar, from .. import foo
        elif isinstance(node, ast.ImportFrom):
            if node.level == 0 and node.module:
                base_mod = node.module
            elif node.level > 0:
                cut = node.level - 1
                if cut <= len(package_parts):
                    base = package_parts[: len(package_parts) - cut]
                    prefix = ".".join(base)
                    if node.module:
                        base_mod = f"{prefix}.{node.module}" if prefix else node.module
                    else:
                        base_mod = prefix
                else:
                    base_mod = node.module or ""
            else:
                base_mod = node.module or ""

            if base_mod:
                imports.append((node.lineno, base_mod))
            for alias in node.names:
                full_sym = f"{base_mod}.{alias.name}" if base_mod else alias.name
                imports.append((node.lineno, full_sym))

        # 3. Dynamic imports: __import__('foo') or importlib.import_module('foo')
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id == "__import__":
                if node.args and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str):
                    imports.append((node.lineno, node.args[0].value))
            elif isinstance(node.func, ast.Attribute) and node.func.attr == "import_module":
                if node.args and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str):
                    imports.append((node.lineno, node.args[0].value))

    return imports


def scan_layer_violations(layer_dir: Path, forbidden_prefixes: tuple[str, ...], repo_root: Path = REPO_ROOT) -> list[str]:
    """Scan all python files in a directory and return formatted violation descriptions."""
    violations = []
    py_files = list(layer_dir.rglob("*.py"))
    assert len(py_files) > 0, f"Layer directory {layer_dir} contains no Python files!"
    for py_file in py_files:
        imports = extract_all_imported_modules(py_file, repo_root)
        for lineno, mod in imports:
            for forbidden in forbidden_prefixes:
                if mod == forbidden or mod.startswith(forbidden + "."):
                    violations.append(f"{py_file.relative_to(repo_root)}:{lineno} imports '{mod}' (forbidden prefix: '{forbidden}')")
    return violations


def test_req_002_directory_packages_exist():
    """Verify that all foundational architectural directories exist as valid Python packages with __init__.py."""
    required_packages = [
        REPO_ROOT / "domain",
        REPO_ROOT / "repositories",
        REPO_ROOT / "services",
        REPO_ROOT / "apps",
        REPO_ROOT / "apps" / "api",
        REPO_ROOT / "apps" / "api" / "routers",
        REPO_ROOT / "apps" / "cli",
        REPO_ROOT / "infrastructure",
        REPO_ROOT / "infrastructure" / "database",
        REPO_ROOT / "shared",
        REPO_ROOT / "shared" / "contracts",
    ]
    for pkg in required_packages:
        assert pkg.is_dir(), f"Package directory missing: {pkg}"
        init_file = pkg / "__init__.py"
        assert init_file.is_file(), f"__init__.py missing in package: {pkg}"


def test_req_002_domain_layer_isolation():
    """Domain layer must not import from services, repositories, or apps."""
    domain_dir = REPO_ROOT / "domain"
    files = list(domain_dir.rglob("*.py"))
    assert len(files) >= 30, f"Expected at least 30 domain files, found {len(files)}"

    violations = scan_layer_violations(domain_dir, ("services", "repositories", "apps"))
    assert not violations, f"Domain layer violations found:\n" + "\n".join(violations)


def test_req_002_repository_layer_isolation():
    """Repository layer must not import from services or apps."""
    repo_dir = REPO_ROOT / "repositories"
    files = list(repo_dir.rglob("*.py"))
    assert len(files) >= 7, f"Expected at least 7 repository files, found {len(files)}"

    violations = scan_layer_violations(repo_dir, ("services", "apps"))
    assert not violations, f"Repository layer violations found:\n" + "\n".join(violations)


def test_req_002_service_layer_isolation():
    """Service layer must not import from presentation/apps layer."""
    service_dir = REPO_ROOT / "services"
    files = list(service_dir.rglob("*.py"))
    assert len(files) >= 35, f"Expected at least 35 service files, found {len(files)}"

    violations = scan_layer_violations(service_dir, ("apps",))
    assert not violations, f"Service layer violations found:\n" + "\n".join(violations)


def test_req_002_api_routers_bypass_guard():
    """API Routers must NOT directly import from repositories; they must interact via services."""
    routers_dir = REPO_ROOT / "apps" / "api" / "routers"
    files = list(routers_dir.rglob("*.py"))
    assert len(files) >= 6, f"Expected at least 6 router files, found {len(files)}"

    violations = scan_layer_violations(routers_dir, ("repositories",))
    assert not violations, f"Router bypass violations found:\n" + "\n".join(violations)


def test_req_002_infrastructure_layer_isolation():
    """Infrastructure layer must not import from services or apps."""
    infra_dir = REPO_ROOT / "infrastructure"
    files = list(infra_dir.rglob("*.py"))
    assert len(files) >= 10, f"Expected at least 10 infrastructure files, found {len(files)}"

    violations = scan_layer_violations(infra_dir, ("services", "apps"))
    assert not violations, f"Infrastructure layer violations found:\n" + "\n".join(violations)


def test_req_002_meta_test_negative_injection_detected(tmp_path):
    """
    Test-of-the-Test (Meta-Testing / Negative Injection):
    Deliberately inject 6 distinct illegal import variants into a fake directory structure
    and verify that scan_layer_violations actively catches and reports every single one.
    """
    fake_repo = tmp_path / "fake_repo"
    fake_domain = fake_repo / "domain" / "subpkg"
    fake_domain.mkdir(parents=True)

    # Inject 6 illegal import variants:
    # 1. direct import
    # 2. from import
    # 3. aliased import
    # 4. relative import pointing out of layer
    # 5. dynamic importlib.import_module
    # 6. dynamic __import__
    synthetic_bad_code = (
        "import services.research.idea_service\n"
        "from apps.api.main import app\n"
        "import repositories.base_repository as base_repo\n"
        "from ...services.scripting import prompt_service\n"
        "import importlib\n"
        "importlib.import_module('services.seo.seo_service')\n"
        "__import__('apps.cli.unified_runner')\n"
    )
    bad_file = fake_domain / "bad_component.py"
    bad_file.write_text(synthetic_bad_code, encoding="utf-8")

    violations = scan_layer_violations(fake_domain, ("services", "repositories", "apps"), repo_root=fake_repo)

    # Must detect violations containing all 6 distinct injection signatures
    assert any("services.research.idea_service" in v for v in violations), "Failed to detect direct import"
    assert any("apps.api.main" in v for v in violations), "Failed to detect from import"
    assert any("repositories.base_repository" in v for v in violations), "Failed to detect aliased import"
    assert any("services.scripting" in v for v in violations), "Failed to detect relative import"
    assert any("services.seo.seo_service" in v for v in violations), "Failed to detect dynamic importlib import"
    assert any("apps.cli.unified_runner" in v for v in violations), "Failed to detect dynamic __import__ call"
