from django.urls import path

from .views import (
    areas,
    branches,
    client_detail,
    clients,
    dashboard,
    dispensers,
    health,
    incidents,
    products,
    user_detail,
    users,
    visits,
)

urlpatterns = [
    path("health/", health, name="health"),
    path("dashboard/", dashboard, name="dashboard"),
    path("clients/", clients, name="clients"),
    path("clients/<int:client_id>/", client_detail, name="client_detail"),
    path("branches/", branches, name="branches"),
    path("areas/", areas, name="areas"),
    path("dispensers/", dispensers, name="dispensers"),
    path("products/", products, name="products"),
    path("visits/", visits, name="visits"),
    path("incidents/", incidents, name="incidents"),
    path("users/", users, name="users"),
    path("users/<int:user_id>/", user_detail, name="user_detail"),
]
