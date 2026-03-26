from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

from app.services import auth_service


class AuthServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_db_path = auth_service.DB_PATH
        fd, temp_path = tempfile.mkstemp(suffix="_auth_test.db")
        os.close(fd)
        self.temp_db_path = Path(temp_path)
        auth_service.DB_PATH = self.temp_db_path
        auth_service.init_auth_db()

    def tearDown(self) -> None:
        auth_service.DB_PATH = self.original_db_path
        try:
            self.temp_db_path.unlink(missing_ok=True)
        except PermissionError:
            pass

    def test_register_login_and_logout_flow(self) -> None:
        session = auth_service.register_user(
            name="Test User",
            email="test@example.com",
            password="Password123",
        )

        self.assertTrue(session.token)
        self.assertEqual(session.user.email, "test@example.com")

        restored = auth_service.get_user_for_token(session.token)
        self.assertIsNotNone(restored)
        self.assertEqual(restored.email, "test@example.com")

        login_session = auth_service.login_user("test@example.com", "Password123")
        self.assertTrue(login_session.token)
        self.assertEqual(login_session.user.name, "Test User")

        auth_service.logout_token(login_session.token)
        self.assertIsNone(auth_service.get_user_for_token(login_session.token))

    def test_duplicate_email_is_rejected(self) -> None:
        auth_service.register_user(
            name="Test User",
            email="duplicate@example.com",
            password="Password123",
        )

        with self.assertRaises(ValueError):
            auth_service.register_user(
                name="Another User",
                email="duplicate@example.com",
                password="Password123",
            )


if __name__ == "__main__":
    unittest.main()
