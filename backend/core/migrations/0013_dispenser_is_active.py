from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0012_product_catalog_independent"),
    ]

    operations = [
        migrations.AddField(
            model_name="dispenser",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
    ]
