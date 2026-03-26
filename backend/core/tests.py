import json
from datetime import timedelta
from unittest.mock import patch

from django.core import signing
from django.db import IntegrityError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.test.client import BOUNDARY, MULTIPART_CONTENT, encode_multipart
from django.utils import timezone

from config import settings_prod
from .models import Area, Audit, AuditForm, Branch, Client, Dispenser, DispenserModel, DispenserProductAssignment, Incident, Product, User, Visit
from .views import _fallback_audit_ai_analysis


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

    def test_account_admin_cannot_create_client(self):
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

        self.assertEqual(response.status_code, 403)
        self.assertEqual(Client.objects.filter(code="CLI-ASSIGNED").count(), 0)

    def test_delete_client_as_general_admin(self):
        target_client = Client.objects.create(name="Delete Me", code="DEL-001")
        general_admin = User.objects.create_user(
            username="ga-client",
            email="ga-client@test.com",
            password="secret123",
            role=User.Role.GENERAL_ADMIN,
        )

        response = self.client.delete(
            f"/api/clients/{target_client.id}/",
            HTTP_X_CURRENT_USER_EMAIL=general_admin.email,
        )

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Client.objects.filter(pk=target_client.id).exists())

    def test_delete_client_forbidden_for_account_admin(self):
        target_client = Client.objects.create(name="Keep Me", code="KEEP-001")
        account_admin = User.objects.create_user(
            username="aa-client",
            email="aa-client@test.com",
            password="secret123",
            role=User.Role.ACCOUNT_ADMIN,
        )
        account_admin.clients.add(target_client)

        response = self.client.delete(
            f"/api/clients/{target_client.id}/",
            HTTP_X_CURRENT_USER_EMAIL=account_admin.email,
        )

        self.assertEqual(response.status_code, 403)
        self.assertTrue(Client.objects.filter(pk=target_client.id).exists())


class ProductApiTests(TestCase):
    def setUp(self):
        self.general_admin = User.objects.create_user(
            username="ga-products",
            email="ga-products@test.com",
            password="secret123",
            role=User.Role.GENERAL_ADMIN,
        )

    def test_delete_product_as_general_admin(self):
        product = Product.objects.create(name="Producto X")

        response = self.client.delete(
            f"/api/products/{product.id}/",
            HTTP_X_CURRENT_USER_EMAIL=self.general_admin.email,
        )

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Product.objects.filter(pk=product.id).exists())

    def test_delete_product_with_dispenser_assignments(self):
        product = Product.objects.create(name="Producto con asignaciones")
        model = DispenserModel.objects.create(name="Modelo QA")
        dispenser = Dispenser.objects.create(model=model, identifier="DSP-DELETE")
        DispenserProductAssignment.objects.create(dispenser=dispenser, product=product)

        response = self.client.delete(
            f"/api/products/{product.id}/",
            HTTP_X_CURRENT_USER_EMAIL=self.general_admin.email,
        )

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Product.objects.filter(pk=product.id).exists())
        self.assertEqual(DispenserProductAssignment.objects.filter(dispenser=dispenser).count(), 0)

    @patch("core.views.Product.delete", side_effect=IntegrityError)
    def test_delete_product_returns_validation_error_on_integrity_conflict(self, _delete_mock):
        product = Product.objects.create(name="Producto bloqueado")

        response = self.client.delete(
            f"/api/products/{product.id}/",
            HTTP_X_CURRENT_USER_EMAIL=self.general_admin.email,
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["error"],
            "No se pudo eliminar el producto por una restricción de integridad.",
        )

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

    def test_list_dispensers(self):
        dispenser = Dispenser.objects.create(model=self.model, identifier="DISP-002", area=self.area)

        response = self.client.get(
            "/api/dispensers/",
            HTTP_X_CURRENT_USER_EMAIL=self.general_admin.email,
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload["results"]), 1)
        self.assertEqual(payload["results"][0]["id"], dispenser.id)
        self.assertEqual(payload["results"][0]["identifier"], dispenser.identifier)

    def test_update_dispenser_accepts_multipart_product_assignments_without_nozzle(self):
        dispenser = Dispenser.objects.create(model=self.model, identifier="DISP-003", area=self.area)
        product = Product.objects.create(name="Jabón")

        body = encode_multipart(
            BOUNDARY,
            {
                "identifier": "DISP-003",
                "model_id": str(self.model.id),
                "area_id": str(self.area.id),
                "is_active": "true",
                "product_assignments": json.dumps(
                    [
                        {
                            "product_id": product.id,
                            "nozzle_id": None,
                        }
                    ]
                ),
            },
        )

        response = self.client.generic(
            "PUT",
            f"/api/dispensers/{dispenser.id}/",
            data=body,
            content_type=MULTIPART_CONTENT,
            HTTP_X_CURRENT_USER_EMAIL=self.general_admin.email,
        )

        self.assertEqual(response.status_code, 200)
        assignment = DispenserProductAssignment.objects.filter(
            dispenser=dispenser,
            product=product,
        ).first()
        self.assertIsNotNone(assignment)
        assert assignment is not None
        self.assertIsNone(assignment.nozzle_id)

    def test_delete_dispenser_with_related_incident_returns_conflict(self):
        dispenser = Dispenser.objects.create(model=self.model, identifier="DISP-004", area=self.area)
        Incident.objects.create(
            client=self.client_entity,
            branch=self.branch,
            area=self.area,
            dispenser=dispenser,
            description="Prueba de incidente",
        )

        response = self.client.delete(
            f"/api/dispensers/{dispenser.id}/",
            HTTP_X_CURRENT_USER_EMAIL=self.general_admin.email,
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(
            response.json()["error"],
            "No se puede eliminar el dosificador porque tiene incidencias u otros registros asociados.",
        )
        self.assertTrue(Dispenser.objects.filter(id=dispenser.id).exists())


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

    def test_inspector_has_global_access_scope(self):
        user = User.objects.create_user(
            username="inspector-scope",
            email="inspector-scope@test.com",
            password="secret",
            role=User.Role.INSPECTOR,
        )

        allowed_response = self.client.get(
            f"/api/visits/{self.visit_a1.id}/report",
            HTTP_X_CURRENT_USER_EMAIL=user.email,
        )
        self.assertEqual(allowed_response.status_code, 400)

        second_response = self.client.get(
            f"/api/visits/{self.visit_b1.id}/report",
            HTTP_X_CURRENT_USER_EMAIL=user.email,
        )
        self.assertEqual(second_response.status_code, 400)

    def test_dashboard_returns_daily_audit_score_history(self):
        form = AuditForm.objects.create(name="Checklist", schema={"questions": []})
        base_date = timezone.now()
        Audit.objects.create(
            area=self.area_a1,
            form=form,
            status=Audit.Status.COMPLETED,
            completed_at=base_date,
            audit_report={"score": 80},
        )
        Audit.objects.create(
            area=self.area_a1,
            form=form,
            status=Audit.Status.COMPLETED,
            completed_at=base_date + timedelta(hours=1),
            audit_report={"score": 60},
        )
        Audit.objects.create(
            area=self.area_a1,
            form=form,
            status=Audit.Status.COMPLETED,
            completed_at=base_date + timedelta(days=1),
            audit_report={"score": 90},
        )

        response = self.client.get("/api/dashboard/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["stats"]["audit_score"], 76.67)
        self.assertEqual(len(payload["daily_audit_score_history"]), 2)
        self.assertEqual(payload["daily_audit_score_history"][0]["score"], 70.0)
        self.assertEqual(payload["daily_audit_score_history"][0]["audits"], 2)


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


class IncidentPermissionsTests(TestCase):
    def setUp(self):
        self.client_entity = Client.objects.create(name="Cliente Inc", code="CL-INC")
        self.branch = Branch.objects.create(client=self.client_entity, name="Sucursal Inc")
        self.area = Area.objects.create(branch=self.branch, name="Área Inc")
        self.model = DispenserModel.objects.create(name="Modelo Inc")
        self.dispenser = Dispenser.objects.create(model=self.model, identifier="D-INC", area=self.area)
        self.branch_admin = User.objects.create_user(
            username="branch-admin",
            email="branch-admin@test.com",
            password="secret123",
            role=User.Role.BRANCH_ADMIN,
        )
        self.branch_admin.branches.add(self.branch)
        self.account_admin = User.objects.create_user(
            username="account-admin-2",
            email="account-admin-2@test.com",
            password="secret123",
            role=User.Role.ACCOUNT_ADMIN,
        )
        self.account_admin.clients.add(self.client_entity)

    def test_branch_admin_can_create_incident(self):
        response = self.client.post(
            "/api/incidents/",
            data=json.dumps(
                {
                    "client_id": self.client_entity.id,
                    "branch_id": self.branch.id,
                    "area_id": self.area.id,
                    "dispenser_id": self.dispenser.id,
                    "description": "Fuga detectada",
                }
            ),
            content_type="application/json",
            HTTP_X_CURRENT_USER_EMAIL=self.branch_admin.email,
        )

        self.assertEqual(response.status_code, 201)

    def test_account_admin_cannot_create_incident(self):
        response = self.client.post(
            "/api/incidents/",
            data=json.dumps(
                {
                    "client_id": self.client_entity.id,
                    "branch_id": self.branch.id,
                    "area_id": self.area.id,
                    "dispenser_id": self.dispenser.id,
                    "description": "Fuga detectada",
                }
            ),
            content_type="application/json",
            HTTP_X_CURRENT_USER_EMAIL=self.account_admin.email,
        )

        self.assertEqual(response.status_code, 403)


class AuditApiTests(TestCase):
    def setUp(self):
        self.client_entity = Client.objects.create(name="Cliente Audit", code="CL-AUD")
        self.branch = Branch.objects.create(client=self.client_entity, name="Sucursal Audit")
        self.area = Area.objects.create(branch=self.branch, name="Área Audit")
        self.general_admin = User.objects.create_user(
            username="ga-audit",
            email="ga-audit@test.com",
            password="secret123",
            role=User.Role.GENERAL_ADMIN,
        )
        self.inspector = User.objects.create_user(
            username="insp-audit",
            email="insp-audit@test.com",
            password="secret123",
            role=User.Role.INSPECTOR,
        )
        self.inspector.areas.add(self.area)


    def test_create_area_with_audit_form_template(self):
        form = AuditForm.objects.create(name="Plantilla Base", schema={"questions": []})

        response = self.client.post(
            "/api/areas/",
            data=json.dumps(
                {
                    "branch_id": self.branch.id,
                    "name": "Área con plantilla",
                    "description": "Desc",
                    "audit_form_template_id": form.id,
                }
            ),
            content_type="application/json",
            HTTP_X_CURRENT_USER_EMAIL=self.general_admin.email,
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["audit_form_template_id"], form.id)

    def test_create_audit_form_and_audit_for_area(self):
        form_response = self.client.post(
            "/api/audits/forms/",
            data=json.dumps(
                {
                    "name": "Checklist Cocina",
                    "schema": {"questions": [{"id": 1, "label": "Orden", "response_type": "yes_no"}]},
                }
            ),
            content_type="application/json",
            HTTP_X_CURRENT_USER_EMAIL=self.general_admin.email,
        )

        self.assertEqual(form_response.status_code, 201)
        form_id = form_response.json()["id"]
        self.area.audit_form_template_id = form_id
        self.area.save(update_fields=["audit_form_template"])

        audit_response = self.client.post(
            "/api/audits/",
            data=json.dumps(
                {
                    "area_id": self.area.id,
                    "inspector_id": self.inspector.id,
                    "notes": "Auditoría inicial",
                }
            ),
            content_type="application/json",
            HTTP_X_CURRENT_USER_EMAIL=self.general_admin.email,
        )

        self.assertEqual(audit_response.status_code, 201)
        payload = audit_response.json()
        self.assertEqual(payload["form_id"], form_id)
        self.assertEqual(payload["form_name"], "Checklist Cocina")
        self.assertEqual(payload["form_schema"]["questions"][0]["label"], "Orden")
        self.assertEqual(payload["form_schema"]["questions"][0]["response_type"], "yes_no")
        self.assertEqual(payload["form_schema"]["questions"][0]["question_weight"], 100)
        self.assertEqual(payload["area_id"], self.area.id)
        self.assertEqual(payload["inspector_id"], self.inspector.id)

    def test_audit_form_defaults_question_weight_and_yes_no_scores(self):
        response = self.client.post(
            "/api/audits/forms/",
            data=json.dumps(
                {
                    "name": "Checklist ponderado",
                    "schema": {
                        "questions": [
                            {"label": "Orden", "response_type": "yes_no"},
                            {"label": "Limpieza", "response_type": "yes_no"},
                        ]
                    },
                }
            ),
            content_type="application/json",
            HTTP_X_CURRENT_USER_EMAIL=self.general_admin.email,
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        questions = payload["schema"]["questions"]
        self.assertEqual(questions[0]["question_weight"], 50)
        self.assertEqual(questions[1]["question_weight"], 50)
        self.assertEqual(questions[0]["response_scores"], {"yes": 100, "no": 0, "not_applicable": 0})

    def test_audit_form_rejects_question_weight_sum_over_100(self):
        response = self.client.post(
            "/api/audits/forms/",
            data=json.dumps(
                {
                    "name": "Checklist inválido",
                    "schema": {
                        "questions": [
                            {"label": "Orden", "response_type": "yes_no", "question_weight": 70},
                            {"label": "Limpieza", "response_type": "yes_no", "question_weight": 40},
                        ]
                    },
                }
            ),
            content_type="application/json",
            HTTP_X_CURRENT_USER_EMAIL=self.general_admin.email,
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("no puede superar el 100%", response.json()["error"])

    def test_audit_keeps_form_snapshot_after_template_changes(self):
        form = AuditForm.objects.create(
            name="Checklist Inicial",
            schema={"questions": [{"id": 1, "label": "Limpieza"}]},
        )
        self.area.audit_form_template = form
        self.area.save(update_fields=["audit_form_template"])

        create_response = self.client.post(
            "/api/audits/",
            data=json.dumps(
                {
                    "area_id": self.area.id,
                    "inspector_id": self.inspector.id,
                    "notes": "Programada",
                }
            ),
            content_type="application/json",
            HTTP_X_CURRENT_USER_EMAIL=self.general_admin.email,
        )

        self.assertEqual(create_response.status_code, 201)
        audit_id = create_response.json()["id"]

        form.name = "Checklist Actualizado"
        form.schema = {"questions": [{"id": 1, "label": "Nuevo"}, {"id": 2, "label": "Piso"}]}
        form.save(update_fields=["name", "schema"])

        list_response = self.client.get(
            "/api/audits/",
            HTTP_X_CURRENT_USER_EMAIL=self.general_admin.email,
        )

        self.assertEqual(list_response.status_code, 200)
        audit_payload = next(item for item in list_response.json()["results"] if item["id"] == audit_id)
        self.assertEqual(audit_payload["form_name"], "Checklist Inicial")
        self.assertEqual(audit_payload["form"], "Checklist Inicial")
        self.assertEqual(
            audit_payload["form_schema"],
            {"questions": [{"id": 1, "label": "Limpieza"}]},
        )

    def test_complete_audit_mobile_flow(self):
        form = AuditForm.objects.create(name="Checklist", schema={"questions": []})
        self.area.audit_form_template = form
        self.area.save(update_fields=["audit_form_template"])

        audit = Audit.objects.create(
            area=self.area,
            form=form,
            inspector=self.inspector,
            status=Audit.Status.SCHEDULED,
            started_at=timezone.now(),
            start_latitude=-12.05,
            start_longitude=-77.04,
        )

        response = self.client.patch(
            f"/api/audits/{audit.id}/mobile-flow/",
            data=json.dumps(
                {
                    "action": "complete",
                    "end_latitude": -12.06,
                    "end_longitude": -77.05,
                    "audit_report": {"location_verified": True, "answers": []},
                }
            ),
            content_type="application/json",
            HTTP_X_CURRENT_USER_EMAIL=self.inspector.email,
        )

        self.assertEqual(response.status_code, 200)
        audit.refresh_from_db()
        self.assertEqual(audit.status, Audit.Status.COMPLETED)
        self.assertIsNotNone(audit.audit_report)
        self.assertEqual(audit.audit_report["form"]["id"], form.id)

    def test_fallback_ai_analysis_assigns_score_when_percentages_are_missing(self):
        report = {
            "form": {
                "schema": {
                    "questions": [
                        {"label": "Orden de estación", "response_type": "yes_no"},
                        {"label": "Limpieza general", "response_type": "yes_no"},
                    ]
                }
            },
            "answers": [
                {"label": "Orden de estación", "value": "Sí", "response_type": "yes_no"},
                {"label": "Limpieza general", "value": "No", "response_type": "yes_no"},
            ],
        }

        analysis = _fallback_audit_ai_analysis(report)

        self.assertEqual(analysis["score"], 50)
        self.assertIn("Informe ejecutivo", analysis["executive_summary"])

    def test_fallback_ai_analysis_does_not_penalize_not_applicable_without_percentages(self):
        report = {
            "form": {
                "schema": {
                    "questions": [
                        {"label": "Control de químicos", "response_type": "yes_no"},
                    ]
                }
            },
            "answers": [
                {"label": "Control de químicos", "value": "No aplica", "response_type": "yes_no"},
            ],
        }

        analysis = _fallback_audit_ai_analysis(report)

        self.assertEqual(analysis["score"], 100)
