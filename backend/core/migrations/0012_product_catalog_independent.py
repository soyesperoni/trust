from django.db import migrations, models


def migrate_product_links(apps, schema_editor):
    Product = apps.get_model("core", "Product")
    Dispenser = apps.get_model("core", "Dispenser")

    through_model = Dispenser.products.through
    links = []
    for product in Product.objects.exclude(dispenser_id__isnull=True).only("id", "dispenser_id"):
        links.append(
            through_model(dispenser_id=product.dispenser_id, product_id=product.id)
        )
    if links:
        through_model.objects.bulk_create(links, ignore_conflicts=True)


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0011_deepseekapisettings"),
    ]

    operations = [
        migrations.AddField(
            model_name="dispenser",
            name="products",
            field=models.ManyToManyField(blank=True, related_name="dispensers", to="core.product"),
        ),
        migrations.RunPython(migrate_product_links, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="product",
            name="dispenser",
        ),
        migrations.AlterUniqueTogether(
            name="product",
            unique_together=set(),
        ),
    ]
