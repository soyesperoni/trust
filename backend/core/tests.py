import json

from django.test import TestCase

from .models import Client


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
