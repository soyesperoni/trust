enum UserRole { inspector, other }

extension UserRoleParsing on UserRole {
  static UserRole fromBackendRole(String? role) {
    switch ((role ?? '').trim().toLowerCase()) {
      case 'inspector':
        return UserRole.inspector;
      default:
        return UserRole.other;
    }
  }

  bool get isInspector => this == UserRole.inspector;
}
