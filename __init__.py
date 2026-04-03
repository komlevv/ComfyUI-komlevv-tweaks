import glob
import importlib.util
import os
import sys

NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
WEB_DIRECTORY = "./web/js"


def _load_python_modules() -> None:
    root_dir = os.path.dirname(__file__)
    py_dir = os.path.join(root_dir, "py")
    if not os.path.isdir(py_dir):
        return

    for file_path in sorted(glob.glob(os.path.join(py_dir, "*.py"))):
        base_name = os.path.basename(file_path)
        if base_name.startswith("_"):
            continue

        module_name = f"komlevv_tweaks_{os.path.splitext(base_name)[0]}"
        spec = importlib.util.spec_from_file_location(module_name, file_path)
        if spec is None or spec.loader is None:
            continue

        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module
        spec.loader.exec_module(module)

        mappings = getattr(module, "NODE_CLASS_MAPPINGS", None)
        if mappings:
            NODE_CLASS_MAPPINGS.update(mappings)

        display_mappings = getattr(module, "NODE_DISPLAY_NAME_MAPPINGS", None)
        if display_mappings:
            NODE_DISPLAY_NAME_MAPPINGS.update(display_mappings)


_load_python_modules()

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
