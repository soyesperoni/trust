# Generated manually for Trust data model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.CreateModel(
            name="Client",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255)),
                ("code", models.CharField(max_length=50, unique=True)),
                ("notes", models.TextField(blank=True)),
            ],
            options={
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="DispenserModel",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255)),
                ("manufacturer", models.CharField(blank=True, max_length=255)),
                ("description", models.TextField(blank=True)),
                ("photo", models.ImageField(blank=True, null=True, upload_to="dispenser_models/")),
            ],
            options={
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="User",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("password", models.CharField(max_length=128, verbose_name="password")),
                ("last_login", models.DateTimeField(blank=True, null=True, verbose_name="last login")),
                ("is_superuser", models.BooleanField(
                    default=False,
                    help_text="Designates that this user has all permissions without explicitly assigning them.",
                    verbose_name="superuser status",
                )),
                ("username", models.CharField(
                    error_messages={"unique": "A user with that username already exists."},
                    help_text="Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.",
                    max_length=150,
                    unique=True,
                    verbose_name="username",
                )),
                ("first_name", models.CharField(blank=True, max_length=150, verbose_name="first name")),
                ("last_name", models.CharField(blank=True, max_length=150, verbose_name="last name")),
                ("email", models.EmailField(blank=True, max_length=254, verbose_name="email address")),
                ("is_staff", models.BooleanField(
                    default=False,
                    help_text="Designates whether the user can log into this admin site.",
                    verbose_name="staff status",
                )),
                ("is_active", models.BooleanField(
                    default=True,
                    help_text="Designates whether this user should be treated as active. Unselect this instead of deleting accounts.",
                    verbose_name="active",
                )),
                ("date_joined", models.DateTimeField(auto_now_add=True, verbose_name="date joined")),
                (
                    "role",
                    models.CharField(
                        choices=[
                            ("general_admin", "Administrador general"),
                            ("account_admin", "Administrador de cuentas"),
                            ("branch_admin", "Administrador de sucursal"),
                            ("inspector", "Inspector"),
                        ],
                        default="inspector",
                        max_length=30,
                    ),
                ),
                (
                    "groups",
                    models.ManyToManyField(
                        blank=True,
                        help_text="The groups this user belongs to. A user will get all permissions granted to each of their groups.",
                        related_name="user_set",
                        related_query_name="user",
                        to="auth.group",
                        verbose_name="groups",
                    ),
                ),
                (
                    "user_permissions",
                    models.ManyToManyField(
                        blank=True,
                        help_text="Specific permissions for this user.",
                        related_name="user_set",
                        related_query_name="user",
                        to="auth.permission",
                        verbose_name="user permissions",
                    ),
                ),
            ],
            options={
                "abstract": False,
            },
        ),
        migrations.CreateModel(
            name="Branch",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255)),
                ("address", models.CharField(blank=True, max_length=255)),
                ("city", models.CharField(blank=True, max_length=120)),
                (
                    "client",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="branches", to="core.client"),
                ),
            ],
            options={
                "ordering": ["name"],
                "unique_together": {("client", "name")},
            },
        ),
        migrations.CreateModel(
            name="Area",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                (
                    "branch",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="areas", to="core.branch"),
                ),
            ],
            options={
                "ordering": ["name"],
                "unique_together": {("branch", "name")},
            },
        ),
        migrations.CreateModel(
            name="Dispenser",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("identifier", models.CharField(max_length=120)),
                ("installed_at", models.DateField(blank=True, null=True)),
                ("photo", models.ImageField(blank=True, null=True, upload_to="dispensers/")),
                (
                    "area",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="dispensers",
                        to="core.area",
                    ),
                ),
                (
                    "model",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="dispensers", to="core.dispensermodel"),
                ),
            ],
            options={
                "ordering": ["identifier"],
                "unique_together": {("model", "identifier")},
            },
        ),
        migrations.CreateModel(
            name="Visit",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("visited_at", models.DateTimeField(auto_now_add=True)),
                ("notes", models.TextField(blank=True)),
                (
                    "area",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="visits", to="core.area"),
                ),
                (
                    "dispenser",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="visits",
                        to="core.dispenser",
                    ),
                ),
                (
                    "inspector",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="visits",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-visited_at"],
            },
        ),
        migrations.CreateModel(
            name="VisitMedia",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "media_type",
                    models.CharField(
                        choices=[("photo", "Foto"), ("video", "Video"), ("other", "Otro")],
                        default="photo",
                        max_length=20,
                    ),
                ),
                ("file", models.FileField(upload_to="visits/media/")),
                ("description", models.CharField(blank=True, max_length=255)),
                (
                    "visit",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="media", to="core.visit"),
                ),
            ],
        ),
        migrations.CreateModel(
            name="Product",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("photo", models.ImageField(blank=True, null=True, upload_to="products/")),
                (
                    "dispenser",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="products", to="core.dispenser"),
                ),
            ],
            options={
                "ordering": ["name"],
                "unique_together": {("dispenser", "name")},
            },
        ),
        migrations.AddField(
            model_name="user",
            name="areas",
            field=models.ManyToManyField(blank=True, related_name="users", to="core.area"),
        ),
        migrations.AddField(
            model_name="user",
            name="branches",
            field=models.ManyToManyField(blank=True, related_name="users", to="core.branch"),
        ),
        migrations.AddField(
            model_name="user",
            name="clients",
            field=models.ManyToManyField(blank=True, related_name="users", to="core.client"),
        ),
    ]
