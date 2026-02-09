from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import (
    Area,
    Branch,
    Client,
    Dispenser,
    DispenserModel,
    Incident,
    IncidentMedia,
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


class ProductInline(admin.TabularInline):
    model = Product
    extra = 0


class VisitMediaInline(admin.TabularInline):
    model = VisitMedia
    extra = 0


class IncidentMediaInline(admin.TabularInline):
    model = IncidentMedia
    extra = 0


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
class DispenserAdmin(admin.ModelAdmin):
    list_display = ("identifier", "model", "area", "branch_name", "client_name")
    list_filter = ("model", "area__branch__client")
    search_fields = ("identifier", "model__name", "area__name", "area__branch__name")
    inlines = [ProductInline]

    @admin.display(description="Sucursal")
    def branch_name(self, obj):
        return obj.area.branch.name if obj.area else ""

    @admin.display(description="Cliente")
    def client_name(self, obj):
        return obj.area.branch.client.name if obj.area else ""


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "dispenser", "area_name", "branch_name", "client_name")
    list_filter = ("dispenser__area__branch__client", "dispenser__model")
    search_fields = ("name", "dispenser__identifier")

    @admin.display(description="Area")
    def area_name(self, obj):
        return obj.dispenser.area.name if obj.dispenser.area else ""

    @admin.display(description="Sucursal")
    def branch_name(self, obj):
        return obj.dispenser.area.branch.name if obj.dispenser.area else ""

    @admin.display(description="Cliente")
    def client_name(self, obj):
        return obj.dispenser.area.branch.client.name if obj.dispenser.area else ""


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
