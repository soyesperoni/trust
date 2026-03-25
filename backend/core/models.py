from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class Client(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.code})"


class Branch(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="branches")
    name = models.CharField(max_length=255)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["name"]
        unique_together = ("client", "name")

    def __str__(self) -> str:
        return f"{self.name} - {self.client.name}"


class Area(models.Model):
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name="areas")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    audit_form_template = models.ForeignKey(
        "AuditForm",
        on_delete=models.SET_NULL,
        related_name="areas_using_template",
        blank=True,
        null=True,
    )

    class Meta:
        ordering = ["name"]
        unique_together = ("branch", "name")

    def __str__(self) -> str:
        return f"{self.name} ({self.branch.name})"


class DispenserModel(models.Model):
    name = models.CharField(max_length=255)
    manufacturer = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    photo = models.ImageField(upload_to="dispenser_models/", blank=True, null=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Dispenser(models.Model):
    model = models.ForeignKey(DispenserModel, on_delete=models.PROTECT, related_name="dispensers")
    identifier = models.CharField(max_length=120)
    area = models.ForeignKey(Area, on_delete=models.SET_NULL, related_name="dispensers", blank=True, null=True)
    installed_at = models.DateField(blank=True, null=True)
    photo = models.ImageField(upload_to="dispensers/", blank=True, null=True)
    products = models.ManyToManyField(
        "Product",
        related_name="dispensers",
        blank=True,
        through="DispenserProductAssignment",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["identifier"]
        unique_together = ("model", "identifier")

    def __str__(self) -> str:
        return f"{self.identifier} ({self.model.name})"


class Product(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    photo = models.ImageField(upload_to="products/", blank=True, null=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Nozzle(models.Model):
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    dispensers = models.ManyToManyField(Dispenser, related_name="available_nozzles", blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class DispenserProductAssignment(models.Model):
    dispenser = models.ForeignKey(Dispenser, on_delete=models.CASCADE, related_name="product_assignments")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="dispenser_assignments")
    nozzle = models.ForeignKey(
        Nozzle,
        on_delete=models.SET_NULL,
        related_name="product_assignments",
        blank=True,
        null=True,
    )

    class Meta:
        unique_together = ("dispenser", "product")
        ordering = ["dispenser__identifier", "product__name"]

    def __str__(self) -> str:
        return f"{self.dispenser.identifier} - {self.product.name}"


class Visit(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", _("Programada")
        COMPLETED = "completed", _("Finalizada")

    area = models.ForeignKey(Area, on_delete=models.CASCADE, related_name="visits")
    dispenser = models.ForeignKey(
        Dispenser,
        on_delete=models.SET_NULL,
        related_name="visits",
        blank=True,
        null=True,
    )
    inspector = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        related_name="visits",
        blank=True,
        null=True,
    )
    visited_at = models.DateTimeField(default=timezone.now)
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SCHEDULED,
    )
    started_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    start_latitude = models.FloatField(blank=True, null=True)
    start_longitude = models.FloatField(blank=True, null=True)
    end_latitude = models.FloatField(blank=True, null=True)
    end_longitude = models.FloatField(blank=True, null=True)
    visit_report = models.JSONField(blank=True, null=True)

    class Meta:
        ordering = ["-visited_at"]

    def __str__(self) -> str:
        return f"Visita {self.area.name} - {self.visited_at:%Y-%m-%d}"


class VisitMedia(models.Model):
    class MediaType(models.TextChoices):
        PHOTO = "photo", _("Foto")
        VIDEO = "video", _("Video")
        OTHER = "other", _("Otro")

    visit = models.ForeignKey(Visit, on_delete=models.CASCADE, related_name="media")
    media_type = models.CharField(max_length=20, choices=MediaType.choices, default=MediaType.PHOTO)
    file = models.FileField(upload_to="visits/media/")
    description = models.CharField(max_length=255, blank=True)

    def __str__(self) -> str:
        return f"{self.get_media_type_display()} - {self.visit}"


class AuditForm(models.Model):
    name = models.CharField(max_length=255)
    schema = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Audit(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", _("Programada")
        COMPLETED = "completed", _("Finalizada")

    area = models.ForeignKey(Area, on_delete=models.CASCADE, related_name="audits")
    form = models.ForeignKey(AuditForm, on_delete=models.PROTECT, related_name="audits")
    form_name = models.CharField(max_length=255, blank=True)
    form_schema = models.JSONField(default=dict, blank=True)
    inspector = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        related_name="audits",
        blank=True,
        null=True,
    )
    audited_at = models.DateTimeField(default=timezone.now)
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SCHEDULED,
    )
    started_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    start_latitude = models.FloatField(blank=True, null=True)
    start_longitude = models.FloatField(blank=True, null=True)
    end_latitude = models.FloatField(blank=True, null=True)
    end_longitude = models.FloatField(blank=True, null=True)
    audit_report = models.JSONField(blank=True, null=True)

    class Meta:
        ordering = ["-audited_at"]

    def __str__(self) -> str:
        return f"Auditoría {self.area.name} - {self.audited_at:%Y-%m-%d}"


class AuditMedia(models.Model):
    class MediaType(models.TextChoices):
        PHOTO = "photo", _("Foto")
        VIDEO = "video", _("Video")
        OTHER = "other", _("Otro")

    audit = models.ForeignKey(Audit, on_delete=models.CASCADE, related_name="media")
    media_type = models.CharField(max_length=20, choices=MediaType.choices, default=MediaType.PHOTO)
    file = models.FileField(upload_to="audits/media/")
    description = models.CharField(max_length=255, blank=True)

    def __str__(self) -> str:
        return f"{self.get_media_type_display()} - {self.audit}"


class DeepSeekAPISettings(models.Model):
    api_key = models.CharField(max_length=255, blank=True)
    model = models.CharField(max_length=120, default="deepseek-reasoner")
    is_enabled = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "DeepSeek API"
        verbose_name_plural = "DeepSeek API"

    def __str__(self) -> str:
        return "DeepSeek API"


class Incident(models.Model):
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="incidents")
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name="incidents")
    area = models.ForeignKey(Area, on_delete=models.PROTECT, related_name="incidents")
    dispenser = models.ForeignKey(Dispenser, on_delete=models.PROTECT, related_name="incidents")
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Incidencia {self.client.name} - {self.created_at:%Y-%m-%d}"


class IncidentMedia(models.Model):
    class MediaType(models.TextChoices):
        PHOTO = "photo", _("Foto")
        VIDEO = "video", _("Video")

    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name="media")
    media_type = models.CharField(max_length=20, choices=MediaType.choices, default=MediaType.PHOTO)
    file = models.FileField(upload_to="incidents/media/")
    description = models.CharField(max_length=255, blank=True)

    def __str__(self) -> str:
        return f"{self.get_media_type_display()} - {self.incident}"


class User(AbstractUser):
    class Role(models.TextChoices):
        GENERAL_ADMIN = "general_admin", _("Administrador general")
        ACCOUNT_ADMIN = "account_admin", _("Administrador de cuentas")
        BRANCH_ADMIN = "branch_admin", _("Administrador de sucursal")
        INSPECTOR = "inspector", _("Inspector")

    role = models.CharField(max_length=30, choices=Role.choices, default=Role.INSPECTOR)
    profile_photo = models.ImageField(upload_to="users/profiles/", blank=True, null=True)
    clients = models.ManyToManyField(Client, blank=True, related_name="users")
    branches = models.ManyToManyField(Branch, blank=True, related_name="users")
    areas = models.ManyToManyField(Area, blank=True, related_name="users")

    def __str__(self) -> str:
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"
