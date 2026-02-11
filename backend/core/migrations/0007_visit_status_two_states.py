from django.db import migrations, models


def normalize_visit_statuses(apps, schema_editor):
    Visit = apps.get_model("core", "Visit")
    Visit.objects.filter(status="in_progress").update(status="scheduled")
    Visit.objects.filter(status="cancelled").update(status="scheduled")


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0006_visit_completed_at_visit_end_latitude_and_more"),
    ]

    operations = [
        migrations.RunPython(normalize_visit_statuses, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="visit",
            name="status",
            field=models.CharField(
                choices=[("scheduled", "Programada"), ("completed", "Finalizada")],
                default="scheduled",
                max_length=20,
            ),
        ),
    ]
