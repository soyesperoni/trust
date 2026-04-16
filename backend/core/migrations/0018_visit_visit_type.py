from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0017_firebaseconfig_fcmdevice"),
    ]

    operations = [
        migrations.AddField(
            model_name="visit",
            name="visit_type",
            field=models.CharField(
                choices=[("technical", "Técnica"), ("commercial", "Comercial")],
                default="technical",
                max_length=20,
            ),
        ),
    ]
