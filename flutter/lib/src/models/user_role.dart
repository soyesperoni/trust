enum UserRole { inspector, generalAdmin, branchAdmin, accountAdmin, other }

extension UserRoleParsing on UserRole {
  static UserRole fromBackendRole(String? role) {
    switch ((role ?? '').trim().toLowerCase()) {
      case 'inspector':
        return UserRole.inspector;
      case 'general_admin':
        return UserRole.generalAdmin;
      case 'branch_admin':
        return UserRole.branchAdmin;
      case 'account_admin':
        return UserRole.accountAdmin;
      default:
        return UserRole.other;
    }
  }

  bool get isInspector => this == UserRole.inspector;

  bool get canCreateIncidents =>
      this == UserRole.generalAdmin || this == UserRole.branchAdmin;
}
