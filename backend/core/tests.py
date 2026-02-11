import json
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone

from config import settings_prod
from .models import Area, Branch, Client, User, Visit


class ClientApiTests(TestCase):
    def test_create_client(self):
        response = self.client.post(
            "/api/clients/",
            data=json.dumps(
                {
                    "name": "Cliente Uno",
                    "code": "CLI-001",
                    "notes": "Cliente creado desde test",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Client.objects.count(), 1)
        payload = response.json()
        self.assertEqual(payload["name"], "Cliente Uno")
        self.assertEqual(payload["code"], "CLI-001")

    def test_update_client(self):
        client = Client.objects.create(name="Old", code="OLD-1", notes="")

        response = self.client.put(
            f"/api/clients/{client.id}/",
            data=json.dumps(
                {
                    "name": "Nuevo Nombre",
                    "notes": "Notas nuevas",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        client.refresh_from_db()
        self.assertEqual(client.name, "Nuevo Nombre")
        self.assertEqual(client.notes, "Notas nuevas")


class ProductionSettingsTests(TestCase):
    def test_default_storage_is_configured_for_media_uploads(self):
        self.assertIn("default", settings_prod.STORAGES)
        self.assertEqual(
            settings_prod.STORAGES["default"]["BACKEND"],
            "django.core.files.storage.FileSystemStorage",
        )


class VisitMobileFlowTests(TestCase):
    def setUp(self):
        self.client_entity = Client.objects.create(name="Cliente", code="CL-1")
        self.branch = Branch.objects.create(client=self.client_entity, name="Sucursal")
        self.area = Area.objects.create(branch=self.branch, name="Área")
        self.inspector = User.objects.create_user(
            username="inspector1",
            email="inspector@test.com",
            password="secret",
            role=User.Role.INSPECTOR,
        )
        self.visit = Visit.objects.create(
            area=self.area,
            inspector=self.inspector,
            status=Visit.Status.SCHEDULED,
            started_at=timezone.now(),
            start_latitude=-12.05,
            start_longitude=-77.04,
        )

    @patch("core.views.VisitMedia.objects.create")
    def test_complete_visit_accepts_multipart_patch_payload(self, create_media_mock):
        evidence = SimpleUploadedFile("evidence.jpg", b"fake-image-bytes", content_type="image/jpeg")

        response = self.client.patch(
            f"/api/visits/{self.visit.id}/mobile-flow/",
            data={
                "action": "complete",
                "end_latitude": "-12.050001",
                "end_longitude": "-77.040001",
                "visit_report": json.dumps(
                    {
                        "checklist": [],
                        "comments": "ok",
                        "location_verified": True,
                        "responsible_name": "Juan",
                        "responsible_signature": "data:image/png;base64,abc",
                    }
                ),
                "evidence_files": evidence,
            },
            HTTP_X_CURRENT_USER_EMAIL=self.inspector.email,
        )

        self.assertEqual(response.status_code, 200)
        self.visit.refresh_from_db()
        self.assertEqual(self.visit.status, Visit.Status.COMPLETED)
        self.assertIsNotNone(self.visit.completed_at)
        self.assertEqual(self.visit.end_latitude, -12.050001)
        self.assertEqual(self.visit.end_longitude, -77.040001)
        self.assertEqual(self.visit.visit_report["responsible_name"], "Juan")
        create_media_mock.assert_called_once()
