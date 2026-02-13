class IncidentMedia {
  const IncidentMedia({
    required this.id,
    required this.type,
    required this.file,
  });

  final int id;
  final String type;
  final String? file;

  factory IncidentMedia.fromJson(Map<String, dynamic> json) {
    return IncidentMedia(
      id: json['id'] as int? ?? 0,
      type: json['type'] as String? ?? 'photo',
      file: json['file'] as String?,
    );
  }
}

class Incident {
  const Incident({
    required this.id,
    required this.client,
    required this.branch,
    required this.area,
    required this.dispenser,
    required this.description,
    required this.createdAt,
    required this.media,
  });

  final int id;
  final String client;
  final String branch;
  final String area;
  final String dispenser;
  final String description;
  final String createdAt;
  final List<IncidentMedia> media;

  factory Incident.fromJson(Map<String, dynamic> json) {
    final media = (json['media'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(IncidentMedia.fromJson)
        .toList(growable: false);

    return Incident(
      id: json['id'] as int? ?? 0,
      client: json['client'] as String? ?? 'Sin cliente',
      branch: json['branch'] as String? ?? 'Sin sucursal',
      area: json['area'] as String? ?? 'Sin área',
      dispenser: json['dispenser'] as String? ?? 'Sin dosificador',
      description: json['description'] as String? ?? '',
      createdAt: json['created_at'] as String? ?? '',
      media: media,
    );
  }
}
