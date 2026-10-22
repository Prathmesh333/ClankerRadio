import io
import json
from pathlib import Path

import pytest
from clanker_api import codex_provider
from clanker_api.arena import Verdict


def test_codex_invocation_uses_structured_stdin_and_read_only_process(monkeypatch):
    captured = {}

    class Process:
        def __init__(self, command, **options):
            captured.update(command=command, options=options)
            self.stdin = io.StringIO()
            self.returncode = 0
            output = Path(command[command.index("--output-last-message") + 1])
            output.write_text(
                json.dumps(
                    {
                        "winner": "A",
                        "scoreA": 80,
                        "scoreB": 70,
                        "approved": True,
                        "reasoning": "Symbolic plan review.",
                    }
                )
            )

        def poll(self):
            return 0

    monkeypatch.setattr(codex_provider, "codex_executable", lambda: "codex-test")
    monkeypatch.setattr(codex_provider.subprocess, "Popen", Process)
    result = codex_provider.ask_codex("Judge the two plans.", Verdict)
    assert result["winner"] == "A"
    command = captured["command"]
    assert command[command.index("--sandbox") + 1] == "read-only"
    assert "--ephemeral" in command
    assert "--output-schema" in command
    assert command[-1] == "-"
    assert not captured["options"].get("shell")


def test_cancelled_codex_call_terminates_child(monkeypatch):
    killed = []

    class Process:
        def __init__(self, *args, **kwargs):
            self.stdin = io.StringIO()
            self.returncode = None

        def poll(self):
            return None

        def kill(self):
            killed.append(True)
            self.returncode = -9

        def wait(self):
            return -9

    monkeypatch.setattr(codex_provider, "codex_executable", lambda: "codex-test")
    monkeypatch.setattr(codex_provider.subprocess, "Popen", Process)
    with pytest.raises(RuntimeError, match="cancelled"):
        codex_provider.ask_codex("Cancelled request.", Verdict, cancelled=lambda: True)
    assert killed == [True]
