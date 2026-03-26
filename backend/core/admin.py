from django.contrib import admin
from django.contrib import messages
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.db import IntegrityError
from django.db.models.deletion import ProtectedError

from .models import (
    Area,
    Audit,
    AuditForm,
    AuditMedia,
    DeepSeekAPISettings,
    Branch,
    Client,
    Dispenser,
    DispenserProductAssignment,
    DispenserModel,
    Incident,
    IncidentMedia,
    Nozzle,
    Product,
    User,
    Visit,
    VisitMedia,
)


class BranchInline(admin.TabularInline):
    model = Branch
    extra = 0


class AreaInline(admin.TabularInline):
    model = Area
    extra = 0


class VisitMediaInline(admin.TabularInline):
    model = VisitMedia
    extra = 0


class IncidentMediaInline(admin.TabularInline):
    model = IncidentMedia
    extra = 0


class AuditMediaInline(admin.TabularInline):
    model = AuditMedia
    extra = 0


class DispenserProductAssignmentInline(admin.TabularInline):
    model = DispenserProductAssignment
    extra = 0
    autocomplete_fields = ("product", "nozzle")


class SafeDeleteAdminMixin:
    delete_error_message = "No se pudo eliminar algunos registros por dependencias o restricciones de integridad."

    def _format_protected_objects(self, protected_objects):
        labels = []
        for protected_obj in protected_objects:
            labels.append(f"{protected_obj._meta.verbose_name}: {protected_obj}")
        return ", ".join(labels)

    def _build_protected_message(self, obj, exc):
        protected_labels = self._format_protected_objects(exc.protected_objects)
        if not protected_labels:
            return f"No se pudo eliminar '{obj}' porque está siendo utilizado por otros registros."
        return f"No se pudo eliminar '{obj}' porque está siendo utilizado por: {protected_labels}."

    def delete_model(self, request, obj):
        try:
            super().delete_model(request, obj)
        except ProtectedError as exc:
            self.message_user(request, self._build_protected_message(obj, exc), level=messages.ERROR)
        except IntegrityError:
            self.message_user(request, self.delete_error_message, level=messages.ERROR)

    def delete_queryset(self, request, queryset):
        failed = 0
        for obj in queryset:
            try:
                obj.delete()
            except ProtectedError as exc:
                failed += 1
                self.message_user(request, self._build_protected_message(obj, exc), level=messages.ERROR)
            except IntegrityError:
                failed += 1
        if failed:
            self.message_user(
                request,
                f"{self.delete_error_message} ({failed} elemento(s) no eliminados).",
                level=messages.ERROR,
            )


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("name", "code")
    search_fields = ("name", "code")
    inlines = [BranchInline]


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ("name", "client", "city")
    list_filter = ("client",)
    search_fields = ("name", "client__name")
    inlines = [AreaInline]


@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ("name", "branch", "client_name")
    list_filter = ("branch__client", "branch")
    search_fields = ("name", "branch__name", "branch__client__name")

    @admin.display(description="Cliente")
    def client_name(self, obj):
        return obj.branch.client.name


@admin.register(DispenserModel)
class DispenserModelAdmin(admin.ModelAdmin):
    list_display = ("name", "manufacturer")
    search_fields = ("name", "manufacturer")


@admin.register(Dispenser)
class DispenserAdmin(SafeDeleteAdminMixin, admin.ModelAdmin):
    list_display = ("identifier", "model", "area", "branch_name", "client_name")
    list_filter = ("model", "area__branch__client")
    search_fields = ("identifier", "model__name", "area__name", "area__branch__name")
    inlines = [DispenserProductAssignmentInline]

    @admin.display(description="Sucursal")
    def branch_name(self, obj):
        return obj.area.branch.name if obj.area else ""

    @admin.display(description="Cliente")
    def client_name(self, obj):
        return obj.area.branch.client.name if obj.area else ""


@admin.register(Product)
class ProductAdmin(SafeDeleteAdminMixin, admin.ModelAdmin):
    list_display = ("name", "linked_dispensers")
    search_fields = ("name", "dispensers__identifier")

    @admin.display(description="Dosificadores")
    def linked_dispensers(self, obj):
        return ", ".join(obj.dispensers.values_list("identifier", flat=True)) or "Sin asignar"


@admin.register(Nozzle)
class NozzleAdmin(admin.ModelAdmin):
    list_display = ("name", "description", "linked_dispensers")
    search_fields = ("name", "dispensers__identifier")
    filter_horizontal = ("dispensers",)

    @admin.display(description="Dosificadores")
    def linked_dispensers(self, obj):
        return ", ".join(obj.dispensers.values_list("identifier", flat=True)) or "Sin asignar"


@admin.register(Visit)
class VisitAdmin(admin.ModelAdmin):
    list_display = ("area", "dispenser", "inspector", "visited_at")
    list_filter = ("area__branch__client", "area__branch", "inspector")
    search_fields = ("area__name", "dispenser__identifier", "inspector__username")
    inlines = [VisitMediaInline]


@admin.register(VisitMedia)
class VisitMediaAdmin(admin.ModelAdmin):
    list_display = ("visit", "media_type", "file")
    list_filter = ("media_type",)




@admin.register(AuditForm)
class AuditFormAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name",)


@admin.register(Audit)
class AuditAdmin(admin.ModelAdmin):
    list_display = ("area", "form", "inspector", "audited_at")
    list_filter = ("area__branch__client", "area__branch", "inspector", "form")
    search_fields = ("area__name", "form__name", "inspector__username")
    inlines = [AuditMediaInline]


@admin.register(AuditMedia)
class AuditMediaAdmin(admin.ModelAdmin):
    list_display = ("audit", "media_type", "file")
    list_filter = ("media_type",)



@admin.register(DeepSeekAPISettings)
class DeepSeekAPISettingsAdmin(admin.ModelAdmin):
    list_display = ("model", "is_enabled", "updated_at")

    def has_add_permission(self, request):
        if DeepSeekAPISettings.objects.exists():
            return False
        return super().has_add_permission(request)

@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = ("client", "branch", "area", "dispenser", "created_at")
    list_filter = ("client", "branch", "area")
    search_fields = ("client__name", "branch__name", "area__name", "dispenser__identifier")
    inlines = [IncidentMediaInline]


@admin.register(IncidentMedia)
class IncidentMediaAdmin(admin.ModelAdmin):
    list_display = ("incident", "media_type", "file")
    list_filter = ("media_type",)


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = DjangoUserAdmin.fieldsets + (
        (
            "Accesos",
            {
                "fields": (
                    "role",
                    "clients",
                    "branches",
                    "areas",
                )
            },
        ),
    )
    add_fieldsets = DjangoUserAdmin.add_fieldsets + (
        (
            "Accesos",
            {
                "fields": (
                    "role",
                    "clients",
                    "branches",
                    "areas",
                )
            },
        ),
    )
    list_display = ("username", "email", "role", "is_staff", "is_active")
    list_filter = ("role", "is_staff", "is_active")
    filter_horizontal = ("groups", "user_permissions", "clients", "branches", "areas")
