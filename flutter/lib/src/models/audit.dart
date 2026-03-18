class Audit {
  const Audit({
    required this.id,
    required this.client,
    required this.branch,
    required this.area,
    required this.inspector,
    required this.auditedAt,
    required this.status,
    required this.formName,
    required this.formSchema,
    required this.auditReport,
  });

  final int id;
  final String client;
  final String branch;
  final String area;
  final String inspector;
  final String auditedAt;
  final String status;
  final String formName;
  final Map<String, dynamic> formSchema;
  final Map<String, dynamic> auditReport;

  factory Audit.fromJson(Map<String, dynamic> json) {
    return Audit(
      id: json['id'] as int? ?? 0,
      client: json['client'] as String? ?? 'Sin cliente',
      branch: json['branch'] as String? ?? 'Sin sucursal',
      area: json['area'] as String? ?? 'Sin área',
      inspector: json['inspector'] as String? ?? 'Sin inspector',
      auditedAt: json['audited_at'] as String? ?? '',
      status: json['status'] as String? ?? 'scheduled',
      formName: json['form_name'] as String? ?? (json['form'] as String? ?? 'Sin plantilla'),
      formSchema: json['form_schema'] is Map<String, dynamic>
          ? json['form_schema'] as Map<String, dynamic>
          : const <String, dynamic>{},
      auditReport: json['audit_report'] is Map<String, dynamic>
          ? json['audit_report'] as Map<String, dynamic>
          : const <String, dynamic>{},
    );
  }
}
