from django.db import migrations, models


def forwards_copy_area_template(apps, schema_editor):
    Area = apps.get_model("core", "Area")
    AuditForm = apps.get_model("core", "AuditForm")

    for area in Area.objects.all().iterator():
        template = AuditForm.objects.filter(area_id=area.id).order_by("id").first()
        if template is not None:
            area.audit_form_template_id = template.id
            area.save(update_fields=["audit_form_template"])


def backwards_restore_area(apps, schema_editor):
    Area = apps.get_model("core", "Area")
    AuditForm = apps.get_model("core", "AuditForm")

    for form in AuditForm.objects.all().iterator():
        area = Area.objects.filter(audit_form_template_id=form.id).order_by("id").first()
        if area is not None:
            form.area_id = area.id
            form.save(update_fields=["area"])


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0009_audit_form_name_audit_form_schema"),
    ]

    operations = [
        migrations.AddField(
            model_name="area",
            name="audit_form_template",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name="areas_using_template",
                to="core.auditform",
            ),
        ),
        migrations.RunPython(forwards_copy_area_template, backwards_restore_area),
        migrations.AlterUniqueTogether(
            name="auditform",
            unique_together=set(),
        ),
        migrations.RemoveField(
            model_name="auditform",
            name="area",
        ),
    ]
