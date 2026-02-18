import json
from unittest.mock import patch

from django.core import signing
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.test.client import BOUNDARY, MULTIPART_CONTENT, encode_multipart
from django.utils import timezone

from config import settings_prod
from .models import Area, Branch, Client, Dispenser, DispenserModel, User, Visit


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

    def test_account_admin_creating_client_gains_access_to_it(self):
        account_admin = User.objects.create_user(
            username="account-admin",
            email="account-admin@test.com",
            password="secret123",
            role=User.Role.ACCOUNT_ADMIN,
        )

        response = self.client.post(
            "/api/clients/",
            data=json.dumps(
                {
                    "name": "Cliente Asignado",
                    "code": "CLI-ASSIGNED",
                    "notes": "Creado por admin de cuentas",
                }
            ),
            content_type="application/json",
            HTTP_X_CURRENT_USER_EMAIL=account_admin.email,
        )

        self.assertEqual(response.status_code, 201)
        created_client = Client.objects.get(code="CLI-ASSIGNED")
        self.assertTrue(account_admin.clients.filter(id=created_client.id).exists())

        list_response = self.client.get(
            "/api/clients/",
            HTTP_X_CURRENT_USER_EMAIL=account_admin.email,
        )
        self.assertEqual(list_response.status_code, 200)
        payload = list_response.json()
        self.assertEqual(len(payload["results"]), 1)
        self.assertEqual(payload["results"][0]["id"], created_client.id)


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
        self.inspector.areas.add(self.area)
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

        body = encode_multipart(
            BOUNDARY,
            {
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
        )

        response = self.client.generic(
            "PATCH",
            f"/api/visits/{self.visit.id}/mobile-flow/",
            data=body,
            content_type=MULTIPART_CONTENT,
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


class DispenserApiTests(TestCase):
    def setUp(self):
        self.client_entity = Client.objects.create(name="Cliente", code="CL-DISP")
        self.branch = Branch.objects.create(client=self.client_entity, name="Sucursal")
        self.area = Area.objects.create(branch=self.branch, name="Área")
        self.model = DispenserModel.objects.create(name="Modelo X", manufacturer="Marca")
        self.general_admin = User.objects.create_user(
            username="ga",
            email="ga@test.com",
            password="secret123",
            role=User.Role.GENERAL_ADMIN,
        )

    def test_create_dispenser(self):
        response = self.client.post(
            "/api/dispensers/",
            data=json.dumps(
                {
                    "identifier": "DISP-001",
                    "model_id": self.model.id,
                    "area_id": self.area.id,
                }
            ),
            content_type="application/json",
            HTTP_X_CURRENT_USER_EMAIL=self.general_admin.email,
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Dispenser.objects.count(), 1)
        created = Dispenser.objects.first()
        assert created is not None
        self.assertEqual(created.identifier, "DISP-001")
        self.assertEqual(created.model_id, self.model.id)
        self.assertEqual(created.area_id, self.area.id)


class VisitReportRouteTests(TestCase):
    def setUp(self):
        self.client_entity = Client.objects.create(name="Cliente", code="CL-1")
        self.branch = Branch.objects.create(client=self.client_entity, name="Sucursal")
        self.area = Area.objects.create(branch=self.branch, name="Área")
        self.inspector = User.objects.create_user(
            username="inspector2",
            email="inspector2@test.com",
            password="secret",
            role=User.Role.INSPECTOR,
        )
        self.inspector.areas.add(self.area)
        self.visit = Visit.objects.create(
            area=self.area,
            inspector=self.inspector,
            status=Visit.Status.COMPLETED,
            started_at=timezone.now(),
            completed_at=timezone.now(),
        )

    @patch("core.views._build_visit_pdf", return_value=b"%PDF-1.4 test")
    def test_legacy_report_route_maps_to_pdf_view(self, build_pdf_mock):
        response = self.client.get(
            f"/api/visits/{self.visit.id}/report",
            HTTP_X_CURRENT_USER_EMAIL=self.inspector.email,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertIn(f'visita-{self.visit.id}-informe.pdf', response["Content-Disposition"])
        build_pdf_mock.assert_called_once()

    def test_report_route_accepts_legacy_json_string_visit_report(self):
        self.visit.visit_report = json.dumps(
            {
                "checklist": [{"status": "ok"}],
                "comments": "Todo en orden",
                "responsible_name": "Supervisor",
            }
        )
        self.visit.save(update_fields=["visit_report"])

        response = self.client.get(
            f"/api/visits/{self.visit.id}/report",
            HTTP_X_CURRENT_USER_EMAIL=self.inspector.email,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")


class VisitPublicReportRouteTests(TestCase):
    def setUp(self):
        self.client_entity = Client.objects.create(name="Cliente", code="CL-2")
        self.branch = Branch.objects.create(client=self.client_entity, name="Sucursal")
        self.area = Area.objects.create(branch=self.branch, name="Área")
        self.visit = Visit.objects.create(
            area=self.area,
            status=Visit.Status.COMPLETED,
            started_at=timezone.now(),
            completed_at=timezone.now(),
        )

    def test_public_report_route_requires_valid_token(self):
        response = self.client.get("/api/visits/report/public/token-invalido.pdf")

        self.assertEqual(response.status_code, 404)

    @patch("core.views._build_visit_pdf", return_value=b"%PDF-1.4 test")
    def test_public_report_route_returns_pdf_without_authentication(self, build_pdf_mock):
        token = signing.dumps({"visit_id": self.visit.id}, salt="visit-report-public-link")

        response = self.client.get(f"/api/visits/report/public/{token}.pdf")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertIn("inline", response["Content-Disposition"])
        build_pdf_mock.assert_called_once_with(self.visit, public_report_url=None)

    def test_public_report_detail_route_requires_valid_token(self):
        response = self.client.get("/api/visits/report/public/token-invalido/")

        self.assertEqual(response.status_code, 404)

    def test_public_report_detail_route_returns_visit_data_without_authentication(self):
        token = signing.dumps({"visit_id": self.visit.id}, salt="visit-report-public-link")

        response = self.client.get(f"/api/visits/report/public/{token}/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["id"], self.visit.id)
        self.assertEqual(payload["status"], Visit.Status.COMPLETED)


class LoginApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="login-user",
            email="login@test.com",
            password="secret123",
            role=User.Role.INSPECTOR,
        )

    def test_login_requires_valid_credentials(self):
        response = self.client.post(
            "/api/login/",
            data=json.dumps({"email": self.user.email, "password": "incorrecta"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)

    def test_login_returns_user_when_credentials_are_valid(self):
        response = self.client.post(
            "/api/login/",
            data=json.dumps({"email": self.user.email, "password": "secret123"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["user"]["email"], self.user.email)


class HierarchicalAccessScopeTests(TestCase):
    def setUp(self):
        self.client_a = Client.objects.create(name="Cliente A", code="CA")
        self.client_b = Client.objects.create(name="Cliente B", code="CB")

        self.branch_a1 = Branch.objects.create(client=self.client_a, name="Sucursal A1")
        self.branch_b1 = Branch.objects.create(client=self.client_b, name="Sucursal B1")

        self.area_a1 = Area.objects.create(branch=self.branch_a1, name="Área A1")
        self.area_b1 = Area.objects.create(branch=self.branch_b1, name="Área B1")

        self.visit_a1 = Visit.objects.create(area=self.area_a1)
        self.visit_b1 = Visit.objects.create(area=self.area_b1)

    def test_account_admin_gets_hierarchical_access_from_client_assignment(self):
        user = User.objects.create_user(
            username="acc-admin",
            email="acc-admin@test.com",
            password="secret",
            role=User.Role.ACCOUNT_ADMIN,
        )
        user.clients.add(self.client_a)

        branches_response = self.client.get(
            "/api/branches/",
            HTTP_X_CURRENT_USER_EMAIL=user.email,
        )
        self.assertEqual(branches_response.status_code, 200)
        self.assertEqual(len(branches_response.json()["results"]), 1)
        self.assertEqual(branches_response.json()["results"][0]["id"], self.branch_a1.id)

        areas_response = self.client.get(
            "/api/areas/",
            HTTP_X_CURRENT_USER_EMAIL=user.email,
        )
        self.assertEqual(areas_response.status_code, 200)
        self.assertEqual(len(areas_response.json()["results"]), 1)
        self.assertEqual(areas_response.json()["results"][0]["id"], self.area_a1.id)

    def test_branch_admin_gets_hierarchical_access_from_branch_assignment(self):
        user = User.objects.create_user(
            username="branch-admin",
            email="branch-admin@test.com",
            password="secret",
            role=User.Role.BRANCH_ADMIN,
        )
        user.branches.add(self.branch_a1)

        dashboard_response = self.client.get(
            "/api/dashboard/",
            HTTP_X_CURRENT_USER_EMAIL=user.email,
        )
        self.assertEqual(dashboard_response.status_code, 200)
        stats = dashboard_response.json()["stats"]
        self.assertEqual(stats["branches"], 1)
        self.assertEqual(stats["areas"], 1)
        self.assertEqual(stats["visits"], 1)

    def test_inspector_can_access_by_assigned_area_only(self):
        user = User.objects.create_user(
            username="inspector-scope",
            email="inspector-scope@test.com",
            password="secret",
            role=User.Role.INSPECTOR,
        )
        user.areas.add(self.area_a1)

        allowed_response = self.client.get(
            f"/api/visits/{self.visit_a1.id}/report",
            HTTP_X_CURRENT_USER_EMAIL=user.email,
        )
        self.assertEqual(allowed_response.status_code, 400)

        blocked_response = self.client.get(
            f"/api/visits/{self.visit_b1.id}/report",
            HTTP_X_CURRENT_USER_EMAIL=user.email,
        )
        self.assertEqual(blocked_response.status_code, 404)


class BranchApiTests(TestCase):
    def setUp(self):
        self.client_entity = Client.objects.create(name="Cliente Uno", code="CLI-01")

    def test_create_branch(self):
        response = self.client.post(
            "/api/branches/",
            data=json.dumps(
                {
                    "client_id": self.client_entity.id,
                    "name": "Sucursal Centro",
                    "address": "Av. Siempre Viva 123",
                    "city": "Monterrey",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Branch.objects.count(), 1)
        branch = Branch.objects.first()
        self.assertIsNotNone(branch)
        branch = Branch.objects.get()
        self.assertEqual(branch.client_id, self.client_entity.id)
        self.assertEqual(branch.name, "Sucursal Centro")

    def test_update_branch(self):
        branch = Branch.objects.create(
            client=self.client_entity,
            name="Sucursal Norte",
            address="",
            city="",
        )

        response = self.client.put(
            f"/api/branches/{branch.id}/",
            data=json.dumps(
                {
                    "name": "Sucursal Norte 2",
                    "address": "Calle 1",
                    "city": "CDMX",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        branch.refresh_from_db()
        self.assertEqual(branch.name, "Sucursal Norte 2")
        self.assertEqual(branch.address, "Calle 1")
        self.assertEqual(branch.city, "CDMX")
