"""Tests for project scanner module."""

import tempfile
from pathlib import Path

import pytest

from jarvis.capture.scanner import analyze_tech_stack, generate_scan_report


class TestAnalyzeTechStack:
    """Tests for analyze_tech_stack function."""

    def test_empty_directory(self):
        """Test scanning an empty directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            result = analyze_tech_stack(Path(tmpdir))

            assert result["tech_stack"] == []
            assert result["file_count"] == 0
            assert result["directory_count"] == 0
            assert result["file_types"] == {}

    def test_python_project(self):
        """Test scanning a Python project."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)

            # Create Python project files
            (project_root / "pyproject.toml").touch()
            (project_root / "main.py").touch()
            (project_root / "utils.py").touch()

            result = analyze_tech_stack(project_root)

            assert "Python" in result["tech_stack"]
            assert result["file_count"] == 3
            assert ".py" in result["file_types"]
            assert result["file_types"][".py"] == 2

    def test_typescript_project(self):
        """Test scanning a TypeScript project."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)

            # Create TypeScript project files
            (project_root / "package.json").touch()
            (project_root / "tsconfig.json").touch()
            (project_root / "index.ts").touch()
            (project_root / "App.tsx").touch()

            result = analyze_tech_stack(project_root)

            assert "TypeScript" in result["tech_stack"]
            assert "JavaScript" in result["tech_stack"]
            assert result["file_count"] == 4
            assert ".ts" in result["file_types"]
            assert ".tsx" in result["file_types"]

    def test_multi_language_project(self):
        """Test scanning a project with multiple languages."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)

            # Create multi-language project
            (project_root / "pyproject.toml").touch()
            (project_root / "package.json").touch()
            (project_root / "go.mod").touch()
            (project_root / "Dockerfile").touch()
            (project_root / "main.py").touch()
            (project_root / "index.ts").touch()
            (project_root / "main.go").touch()

            result = analyze_tech_stack(project_root)

            assert "Python" in result["tech_stack"]
            assert "TypeScript" in result["tech_stack"]
            assert "JavaScript" in result["tech_stack"]
            assert "Go" in result["tech_stack"]
            assert "Docker" in result["tech_stack"]
            assert result["file_count"] == 7

    def test_ignore_directories(self):
        """Test that ignored directories are skipped."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)

            # Create files in root
            (project_root / "main.py").touch()

            # Create ignored directories with files
            node_modules = project_root / "node_modules"
            node_modules.mkdir()
            (node_modules / "package.json").touch()

            git_dir = project_root / ".git"
            git_dir.mkdir()
            (git_dir / "config").touch()

            result = analyze_tech_stack(project_root)

            # Should only count main.py, not files in ignored dirs
            assert result["file_count"] == 1
            assert "Python" in result["tech_stack"]

    def test_nested_structure(self):
        """Test scanning nested directory structure."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)

            # Create nested structure
            src_dir = project_root / "src"
            src_dir.mkdir()
            (src_dir / "main.py").touch()

            tests_dir = project_root / "tests"
            tests_dir.mkdir()
            (tests_dir / "test_main.py").touch()

            result = analyze_tech_stack(project_root)

            assert result["file_count"] == 2
            assert result["directory_count"] == 2
            assert "Python" in result["tech_stack"]

    def test_github_actions(self):
        """Test detection of GitHub Actions."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)

            # Create GitHub Actions workflow
            workflows_dir = project_root / ".github" / "workflows"
            workflows_dir.mkdir(parents=True)
            (workflows_dir / "ci.yml").touch()

            result = analyze_tech_stack(project_root)

            assert "GitHub Actions" in result["tech_stack"]

    def test_nonexistent_directory(self):
        """Test scanning a non-existent directory."""
        result = analyze_tech_stack(Path("/nonexistent/path"))

        assert result["tech_stack"] == []
        assert result["file_count"] == 0

    def test_java_project(self):
        """Test scanning a Java Maven project."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)

            (project_root / "pom.xml").touch()
            (project_root / "Main.java").touch()

            result = analyze_tech_stack(project_root)

            assert "Java" in result["tech_stack"]
            assert ".java" in result["file_types"]

    def test_rust_project(self):
        """Test scanning a Rust project."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)

            (project_root / "Cargo.toml").touch()
            (project_root / "main.rs").touch()

            result = analyze_tech_stack(project_root)

            assert "Rust" in result["tech_stack"]
            assert ".rs" in result["file_types"]


class TestGenerateScanReport:
    """Tests for generate_scan_report function."""

    def test_empty_analysis(self):
        """Test report generation for empty analysis."""
        analysis = {
            "tech_stack": [],
            "file_count": 0,
            "directory_count": 0,
            "file_types": {},
            "project_files": [],
        }

        report = generate_scan_report(analysis)

        assert "✓ Scan complete, Sir" in report
        assert "0 technologies" in report
        assert "0 files" in report

    def test_single_technology(self):
        """Test report with single technology."""
        analysis = {
            "tech_stack": ["Python"],
            "file_count": 10,
            "directory_count": 3,
            "file_types": {".py": 8, ".txt": 2},
            "project_files": [],
        }

        report = generate_scan_report(analysis)

        assert "✓ Scan complete, Sir" in report
        assert "1 technology" in report
        assert "Python" in report
        assert "10 files" in report

    def test_multiple_technologies(self):
        """Test report with multiple technologies."""
        analysis = {
            "tech_stack": ["Python", "TypeScript", "Docker"],
            "file_count": 150,
            "directory_count": 20,
            "file_types": {
                ".py": 50,
                ".ts": 80,
                ".json": 10,
                ".md": 5,
                ".txt": 5,
            },
            "project_files": [],
        }

        report = generate_scan_report(analysis)

        assert "✓ Scan complete, Sir" in report
        assert "3 technologies" in report
        assert "Python" in report
        assert "TypeScript" in report
        assert "Docker" in report
        assert "150 files" in report
        assert "📊 Project Statistics" in report
        assert "🔧 Technology Stack" in report
        assert "📁 File Types" in report

    def test_file_types_sorted(self):
        """Test that file types are sorted by count."""
        analysis = {
            "tech_stack": ["Python"],
            "file_count": 100,
            "directory_count": 10,
            "file_types": {
                ".py": 50,
                ".txt": 5,
                ".json": 30,
                ".md": 10,
                ".yml": 5,
            },
            "project_files": [],
        }

        report = generate_scan_report(analysis)

        # Find file types section
        lines = report.split("\n")
        file_types_idx = next(
            i for i, line in enumerate(lines) if "📁 File Types" in line
        )

        # Check that .py appears before .json (higher count)
        py_idx = next(i for i, line in enumerate(lines) if ".py:" in line)
        json_idx = next(i for i, line in enumerate(lines) if ".json:" in line)

        assert py_idx < json_idx
        assert py_idx > file_types_idx

    def test_top_10_file_types(self):
        """Test that only top 10 file types are shown."""
        file_types = {f".ext{i}": 100 - i for i in range(15)}

        analysis = {
            "tech_stack": [],
            "file_count": sum(file_types.values()),
            "directory_count": 1,
            "file_types": file_types,
            "project_files": [],
        }

        report = generate_scan_report(analysis)

        # Count file type entries
        file_type_lines = [
            line for line in report.split("\n") if line.strip().startswith("• .")
        ]

        # Should have exactly 10 file types
        assert len(file_type_lines) == 10
