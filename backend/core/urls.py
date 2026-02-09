from django.urls import path

from .views import dashboard, health, user_detail, users

urlpatterns = [
    path("health/", health, name="health"),
    path("dashboard/", dashboard, name="dashboard"),
    path("users/", users, name="users"),
    path("users/<int:user_id>/", user_detail, name="user_detail"),
]
