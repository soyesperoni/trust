from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
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

    class Meta:
        ordering = ["identifier"]
        unique_together = ("model", "identifier")

    def __str__(self) -> str:
        return f"{self.identifier} ({self.model.name})"


class Product(models.Model):
    dispenser = models.ForeignKey(Dispenser, on_delete=models.CASCADE, related_name="products")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    photo = models.ImageField(upload_to="products/", blank=True, null=True)

    class Meta:
        ordering = ["name"]
        unique_together = ("dispenser", "name")

    def clean(self) -> None:
        super().clean()
        if self.dispenser_id is None:
            return
        existing = Product.objects.filter(dispenser=self.dispenser).exclude(pk=self.pk).count()
        if existing >= 4:
            raise ValidationError(_("Cada dosificador puede tener máximo 4 productos."))

    def __str__(self) -> str:
        return f"{self.name} ({self.dispenser.identifier})"


class Visit(models.Model):
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
    visited_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

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
    clients = models.ManyToManyField(Client, blank=True, related_name="users")
    branches = models.ManyToManyField(Branch, blank=True, related_name="users")
    areas = models.ManyToManyField(Area, blank=True, related_name="users")

    def __str__(self) -> str:
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"
