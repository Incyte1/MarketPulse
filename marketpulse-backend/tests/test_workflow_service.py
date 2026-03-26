from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

from app.services import auth_service, workflow_service


class WorkflowServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_auth_db_path = auth_service.DB_PATH
        self.original_workflow_db_path = workflow_service.DB_PATH
        fd, temp_path = tempfile.mkstemp(suffix="_workflow_test.db")
        os.close(fd)
        self.temp_db_path = Path(temp_path)

        auth_service.DB_PATH = self.temp_db_path
        workflow_service.DB_PATH = self.temp_db_path

        auth_service.init_auth_db()
        workflow_service.init_workflow_db()

        self.session = auth_service.register_user(
            name="Workflow User",
            email="workflow@example.com",
            password="Password123",
        )

    def tearDown(self) -> None:
        auth_service.DB_PATH = self.original_auth_db_path
        workflow_service.DB_PATH = self.original_workflow_db_path
        try:
            self.temp_db_path.unlink(missing_ok=True)
        except PermissionError:
            pass

    def test_default_workspace_is_created_and_mutable(self) -> None:
        workspaces = workflow_service.list_workspaces(self.session.user.id)

        self.assertEqual(len(workspaces), 1)
        self.assertTrue(workspaces[0].is_default)
        self.assertEqual(workspaces[0].selected_symbol, "SPY")

        updated = workflow_service.update_workspace(
            user_id=self.session.user.id,
            workspace_id=workspaces[0].id,
            selected_symbol="QQQ",
            selected_horizon="long_term",
        )

        self.assertEqual(updated.selected_symbol, "QQQ")
        self.assertEqual(updated.selected_horizon, "long_term")

    def test_workspace_watchlist_alerts_and_memo_flow(self) -> None:
        workspace = workflow_service.create_workspace(
            user_id=self.session.user.id,
            name="PM Desk",
            description="Primary review board.",
            selected_symbol="NVDA",
            selected_horizon="short_term",
        )

        detail = workflow_service.add_watchlist_symbol(
            user_id=self.session.user.id,
            workspace_id=workspace.id,
            symbol="AAPL",
            notes="Earnings follow-up",
        )
        self.assertEqual(detail.workspace.selected_symbol, "AAPL")
        self.assertEqual(len(detail.watchlist), 1)
        self.assertEqual(detail.watchlist[0].symbol, "AAPL")

        detail = workflow_service.create_alert(
            user_id=self.session.user.id,
            workspace_id=workspace.id,
            symbol="AAPL",
            horizon="short_term",
            rule_type="breakout_above",
            level=212.5,
            note="Watch reclaim of local supply.",
        )
        self.assertEqual(len(detail.alerts), 1)
        self.assertEqual(detail.alerts[0].rule_type, "breakout_above")

        detail = workflow_service.upsert_memo(
            user_id=self.session.user.id,
            workspace_id=workspace.id,
            thesis="Momentum leadership is rebuilding.",
            setup="Wait for acceptance above resistance.",
            risks="Breakout could fail if breadth narrows.",
            invalidation="Close back under support.",
            execution_plan="Scale in only after confirmation.",
            source_links=[],
        )

        self.assertEqual(detail.memo.thesis, "Momentum leadership is rebuilding.")
        self.assertEqual(detail.memo.execution_plan, "Scale in only after confirmation.")
        self.assertEqual(len(detail.alerts), 1)


if __name__ == "__main__":
    unittest.main()
