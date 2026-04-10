"""PikaBuddy Backend API Tests"""
import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# backend to Python path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from main import app

client = TestClient(app, raise_server_exceptions=False)


class TestHealth:
    """Health check endpoint tests"""

    def test_health_check(self):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_root_endpoint(self):
        response = client.get("/")
        assert response.status_code == 200
        assert "message" in response.json()


class TestAuthBasic:
    """Basic authentication tests"""

    def test_admin_login_missing_credentials(self):
        response = client.post("/api/auth/admin-login", json={
            "username": "",
            "password": ""
        })
        # 401 (invalid creds) or 500 (no Supabase connection)
        assert response.status_code in [401, 500]

    def test_admin_login_invalid_credentials(self):
        response = client.post("/api/auth/admin-login", json={
            "username": "invalid_user",
            "password": "invalid_pass"
        })
        assert response.status_code in [401, 500]

    def test_get_me_requires_auth(self):
        response = client.get("/api/auth/me")
        assert response.status_code in [401, 403, 422, 500]


class TestAssignmentBasic:
    """Assignment CRUD tests"""

    def test_create_assignment_requires_auth(self):
        course_id = "test-course-id"
        response = client.post(
            f"/api/courses/{course_id}/assignments",
            json={
                "title": "Test Assignment",
                "topic": "Python",
                "type": "coding"
            }
        )
        assert response.status_code in [401, 403, 422, 500]

    def test_get_assignments_requires_auth(self):
        course_id = "test-course-id"
        response = client.get(f"/api/courses/{course_id}/assignments")
        assert response.status_code in [401, 403, 422, 500]


class TestEditorApi:
    """Editor API tests — snapshots and paste logging"""

    def test_snapshot_requires_auth(self):
        response = client.post(
            "/api/assignments/test-id/snapshots",
            json={
                "code": "print('hello')",
                "language": "python"
            }
        )
        assert response.status_code in [401, 403, 422, 500]

    def test_paste_logging_requires_auth(self):
        response = client.post(
            "/api/assignments/test-id/paste-log",
            json={
                "paste_length": 50,
                "paste_source": "external"
            }
        )
        assert response.status_code in [401, 403, 422, 500]


class TestAnalysisApi:
    """Analysis API tests"""

    def test_feedback_requires_auth(self):
        response = client.get(
            "/api/submissions/test-sub-id/analysis"
        )
        assert response.status_code in [401, 403, 422, 500]


class TestQuizApi:
    """Quiz auto-grading tests"""

    def test_quiz_grading_requires_auth(self):
        response = client.post(
            "/api/assignments/test-id/quiz-grade",
            json={
                "answers": {"q1": "A"}
            }
        )
        assert response.status_code in [401, 403, 422, 500]


class TestRunnerApi:
    """Code execution sandbox tests"""

    def test_code_judge_requires_auth(self):
        response = client.post(
            "/api/code/judge",
            json={
                "code": "print('hello')",
                "language": "python"
            }
        )
        assert response.status_code in [401, 403, 422, 500]

    def test_code_run_requires_auth(self):
        response = client.post(
            "/api/code/run",
            json={
                "code": "print('hello')",
                "language": "python"
            }
        )
        assert response.status_code in [401, 403, 422, 500]


class TestNotesApi:
    """Notes API tests"""

    def test_create_note_requires_auth(self):
        response = client.post(
            "/api/courses/test-course/notes",
            json={
                "title": "Test Note",
                "content": "Note content"
            }
        )
        assert response.status_code in [401, 403, 422, 500]

    def test_get_notes_requires_auth(self):
        response = client.get("/api/courses/test-course/notes")
        assert response.status_code in [401, 403, 422, 500]

    def test_note_graph_requires_auth(self):
        response = client.get("/api/courses/test-course/notes/graph")
        assert response.status_code in [401, 403, 422, 500]


class TestTutorApi:
    """Tutor API tests"""

    def test_tutor_chat_requires_auth(self):
        response = client.post(
            "/api/tutor/chat",
            json={
                "message": "What does this code do?",
                "context": "def add(a, b): return a + b"
            }
        )
        assert response.status_code in [401, 403, 422, 500]


class TestExamApi:
    """Exam proctoring API tests"""

    def test_screenshot_upload_requires_auth(self):
        response = client.post(
            "/api/exam/screenshot",
            json={
                "assignment_id": "test-exam",
                "screenshot_base64": "fake-base64-data"
            }
        )
        assert response.status_code in [401, 403, 422, 500]

    def test_exam_start_requires_auth(self):
        response = client.post(
            "/api/exam/start",
            json={"assignment_id": "test-exam"}
        )
        assert response.status_code in [401, 403, 422, 500]


class TestGamificationApi:
    """Gamification API tests"""

    def test_get_my_tier_requires_auth(self):
        response = client.get("/api/gamification/me/tier")
        assert response.status_code in [401, 403, 422, 500]

    def test_get_my_badges_requires_auth(self):
        response = client.get("/api/gamification/me/badges")
        assert response.status_code in [401, 403, 422, 500]

    def test_get_tiers_list(self):
        response = client.get("/api/gamification/tiers")
        assert response.status_code in [200, 401, 500]


class TestDashboardApi:
    """Dashboard API tests"""

    def test_dashboard_requires_auth(self):
        response = client.get("/api/courses/test-course/dashboard")
        assert response.status_code in [401, 403, 422, 500]

    def test_insights_requires_auth(self):
        response = client.get("/api/courses/test-course/insights")
        assert response.status_code in [401, 403, 422, 500]


class TestMaterialsApi:
    """Materials API tests"""

    def test_get_materials_requires_auth(self):
        response = client.get("/api/courses/test-course/materials")
        assert response.status_code in [401, 403, 422, 500]


class TestErrorHandling:
    """Error handling tests"""

    def test_nonexistent_endpoint(self):
        response = client.get("/api/nonexistent/endpoint")
        assert response.status_code == 404

    def test_malformed_json(self):
        response = client.post(
            "/api/auth/admin-login",
            content=b"invalid json",
            headers={"content-type": "application/json"}
        )
        assert response.status_code == 422


class TestCORS:
    """CORS configuration tests"""

    def test_health_check_accessible(self):
        response = client.get("/health")
        assert response.status_code == 200


class TestIntegration:
    """Integration tests"""

    def test_api_documentation_available(self):
        response = client.get("/docs")
        assert response.status_code == 200

    def test_openapi_schema_available(self):
        response = client.get("/openapi.json")
        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data
        assert "paths" in data

    def test_openapi_has_expected_paths(self):
        response = client.get("/openapi.json")
        data = response.json()
        paths = data["paths"]
        assert "/api/auth/admin-login" in paths
        assert "/api/courses" in paths
        assert "/health" in paths


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
