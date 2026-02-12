class Incident {
  const Incident({
    required this.id,
    required this.type,
    required this.status,
    required this.createdAt,
    required this.dispenser,
    required this.reportedBy,
  });

  final int id;
  final String type;
  final String status;
  final String createdAt;
  final String dispenser;
  final String reportedBy;

  factory Incident.fromJson(Map<String, dynamic> json) {
    final dispenser = json['dispenser'];
    return Incident(
      id: json['id'] as int? ?? 0,
      type: json['type'] as String? ?? 'general',
      status: json['status'] as String? ?? 'open',
      createdAt: json['created_at'] as String? ?? '',
      dispenser: dispenser is Map<String, dynamic>
          ? (dispenser['identifier'] as String? ?? 'Sin dosificador')
          : 'Sin dosificador',
      reportedBy: json['reported_by'] as String? ?? 'No definido',
    );
  }
}
