"""Create a source archive, excluding secrets, runtime databases and dependencies."""
import os
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
destination = root / "output/orbita-source.zip"
destination.parent.mkdir(exist_ok=True)
excluded = {"node_modules", ".next", ".git", "data", "coverage", "tmp", "output", "test-results", "playwright-report", "__pycache__", ".openai"}
count = 0
with ZipFile(destination, "w", ZIP_DEFLATED) as archive:
    for current, dirs, files in os.walk(root):
        dirs[:] = [name for name in dirs if name not in excluded]
        for name in files:
            if (name.startswith(".env") and name != ".env.example") or name.endswith((".tsbuildinfo", ".db", ".db-wal", ".db-shm")):
                continue
            path = Path(current) / name
            if path.is_symlink():
                continue
            archive.write(path, path.relative_to(root).as_posix())
            count += 1
with ZipFile(destination) as archive:
    assert archive.testzip() is None
    assert "package.json" in archive.namelist()
    assert ".env.example" in archive.namelist()
    assert all(not name.startswith(("data/", "node_modules/", ".next/")) for name in archive.namelist())
    assert all(not Path(name).name.startswith(".env") or Path(name).name == ".env.example" for name in archive.namelist())
print(f"{destination}: {count} files, {destination.stat().st_size:,} bytes. No runtime database or .env secrets.")
