import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:printing/printing.dart';
import 'package:video_player/video_player.dart';

import '../services/trust_repository.dart';
import '../theme/app_colors.dart';

class AuditReportScreen extends StatefulWidget {
  const AuditReportScreen({
    required this.auditId,
    required this.email,
    this.openWithDownload = false,
    super.key,
  });

  final int auditId;
  final String email;
  final bool openWithDownload;

  @override
  State<AuditReportScreen> createState() => _AuditReportScreenState();
}

class _AuditReportScreenState extends State<AuditReportScreen> {
  final TrustRepository _repository = TrustRepository();

  bool _isLoading = true;
  bool _isDownloadingPdf = false;
  String? _error;
  Map<String, dynamic>? _audit;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      final result = await _repository.loadAuditReportData(
        email: widget.email,
        auditId: widget.auditId,
      );

      if (!mounted) return;
      setState(() {
        _audit = result;
      });
      if (widget.openWithDownload) {
        await _downloadPdf();
      }
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _downloadPdf() async {
    try {
      setState(() {
        _isDownloadingPdf = true;
        _error = null;
      });
      final bytes = await _repository.downloadAuditReportPdf(
        email: widget.email,
        auditId: widget.auditId,
      );
      await Printing.sharePdf(bytes: bytes, filename: 'auditoria-${widget.auditId}-informe.pdf');
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() => _isDownloadingPdf = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_error != null || _audit == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Informe de auditoría')),
        body: Center(child: Text(_error ?? 'No se encontró la auditoría.')),
      );
    }

    final audit = _audit!;
    final report = (audit['audit_report'] as Map<String, dynamic>?) ?? const {};
    final aiAnalysis = (report['ai_analysis'] as Map<String, dynamic>?) ?? const {};
    final score = _resolveScore(report, aiAnalysis);
    final scoreLabel = _scoreLabel(score);
    final scoreColor = _scoreColor(score);
    final recommendations = (aiAnalysis['recommendations'] as List<dynamic>? ?? const [])
        .map((item) => '$item'.trim())
        .where((item) => item.isNotEmpty)
        .toList(growable: false);
    final answers = (report['answers'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .toList(growable: false);
    final media = (audit['media'] as List<dynamic>? ?? const []).whereType<Map<String, dynamic>>().toList(growable: false);
    final photos = media.where(_isImageMedia).toList(growable: false);
    final videos = media.where(_isVideoMedia).toList(growable: false);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Informe de auditoría'),
        actions: [
          IconButton(
            onPressed: _isDownloadingPdf ? null : _downloadPdf,
            icon: _isDownloadingPdf
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.download_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _section(
              title: 'Resumen',
              child: Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  _chip('Auditoría', '#${audit['id'] ?? '--'}'),
                  _chip('Cliente', '${audit['client'] ?? 'Sin cliente'}'),
                  _chip('Sucursal', '${audit['branch'] ?? 'Sin sucursal'}'),
                  _chip('Área', '${audit['area'] ?? 'Sin área'}'),
                  _chip('Inspector', '${audit['inspector'] ?? 'Sin inspector'}'),
                  _chip('Estado', (audit['status'] as String? ?? '').contains('completed') ? 'Finalizada' : 'Programada'),
                  _chip('Score', score == null ? 'Sin score' : '$score%'),
                ],
              ),
            ),
            _section(
              title: 'Trust AI',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Análisis automático del desempeño y riesgos de la auditoría.',
                    style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _trustAiMetric(
                          title: 'Score',
                          value: score == null ? 'Sin score' : '$score%',
                          valueColor: scoreColor,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _trustAiMetric(
                          title: 'Estado operativo',
                          value: scoreLabel,
                          valueColor: scoreColor,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      minHeight: 8,
                      value: score == null ? 0 : score / 100,
                      backgroundColor: Theme.of(context).brightness == Brightness.dark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                      valueColor: AlwaysStoppedAnimation<Color>(scoreColor),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text('${aiAnalysis['executive_summary'] ?? 'Sin informe ejecutivo generado por Trust AI.'}'),
                  const SizedBox(height: 10),
                  Text(
                    'Impacto al negocio: ${aiAnalysis['business_impact'] ?? 'Sin evaluación registrada.'}',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  if (recommendations.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    const Text(
                      'Recomendaciones',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 6),
                    ...recommendations.take(3).map(
                      (item) => Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Text('• $item'),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            _section(
              title: 'Responsable y comentarios',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Responsable: ${report['responsible_name'] ?? 'No registrado'}'),
                  const SizedBox(height: 8),
                  Text('Comentarios: ${report['comments'] ?? 'Sin comentarios'}'),
                  const SizedBox(height: 8),
                  Text('Ubicación verificada: ${report['location_verified'] == true ? 'Sí' : 'No'}'),
                  const SizedBox(height: 12),
                  _buildResponsibleSignature(report['responsible_signature'] as String?),
                ],
              ),
            ),
            _section(
              title: 'Preguntas y respuestas',
              child: answers.isEmpty
                  ? const Text('No hay respuestas registradas.')
                  : Column(
                      children: answers
                          .map(
                            (item) => ListTile(
                              dense: true,
                              contentPadding: EdgeInsets.zero,
                              leading: const Icon(Icons.quiz_outlined),
                              title: Text('${item['label'] ?? 'Pregunta'}'),
                              subtitle: Text('${item['value'] ?? 'Sin respuesta'}'),
                            ),
                          )
                          .toList(growable: false),
                    ),
            ),
            _section(
              title: 'Evidencias fotográficas',
              child: photos.isEmpty
                  ? const Text('No hay fotos registradas.')
                  : _buildMediaGallery(photos, isVideo: false),
            ),
            _section(
              title: 'Evidencias de video',
              child: videos.isEmpty
                  ? const Text('No hay videos registrados.')
                  : _buildMediaGallery(videos, isVideo: true),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Text(
                  _error!,
                  style: const TextStyle(color: Colors.red),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildResponsibleSignature(String? signatureValue) {
    final imageBytes = _decodeDataImage(signatureValue);
    if (imageBytes == null) {
      return const SizedBox.shrink();
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Container(
        color: Colors.white,
        padding: const EdgeInsets.all(10),
        child: Image.memory(
          imageBytes,
          height: 120,
          fit: BoxFit.contain,
        ),
      ),
    );
  }

  Widget _trustAiMetric({
    required String title,
    required String value,
    required Color valueColor,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 11,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: valueColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMediaGallery(List<Map<String, dynamic>> items, {required bool isVideo}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return SizedBox(
      height: 120,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (context, index) {
          final url = _toAbsoluteMediaUrl(items[index]['file'] as String?);
          return AspectRatio(
            aspectRatio: 1,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Material(
                color: isDark ? AppColors.darkCard : const Color(0xFFF3F4F6),
                child: InkWell(
                  onTap: url == null ? null : () => _openMediaPopup(url, isVideo: isVideo),
                  child: url == null
                      ? Icon(isVideo ? Icons.videocam_off_outlined : Icons.image_not_supported_outlined)
                      : Stack(
                          fit: StackFit.expand,
                          children: [
                            if (isVideo)
                              Container(
                                color: isDark ? AppColors.darkSurface : const Color(0xFFE5E7EB),
                                child: const Icon(Icons.play_circle_fill_rounded, size: 42),
                              )
                            else
                              Image.network(url, fit: BoxFit.cover),
                            Align(
                              alignment: Alignment.bottomCenter,
                              child: Container(
                                width: double.infinity,
                                color: Colors.black54,
                                padding: const EdgeInsets.symmetric(vertical: 4),
                                child: Text(
                                  isVideo ? 'Abrir video' : 'Ver foto',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(color: Colors.white, fontSize: 11),
                                ),
                              ),
                            ),
                          ],
                        ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _openMediaPopup(String url, {required bool isVideo}) async {
    if (url.isEmpty) {
      return;
    }

    await showDialog<void>(
      context: context,
      builder: (_) => Dialog(
        insetPadding: const EdgeInsets.all(16),
        clipBehavior: Clip.antiAlias,
        child: AspectRatio(
          aspectRatio: isVideo ? 9 / 16 : 4 / 5,
          child: isVideo ? _VideoEvidencePlayer(url: url) : _PhotoEvidenceViewer(url: url),
        ),
      ),
    );
  }

  Uint8List? _decodeDataImage(String? source) {
    if (source == null || source.isEmpty) {
      return null;
    }
    if (!source.startsWith('data:image')) {
      return null;
    }

    final marker = ';base64,';
    final markerIndex = source.indexOf(marker);
    if (markerIndex < 0) {
      return null;
    }

    final base64Value = source.substring(markerIndex + marker.length);
    try {
      return base64Decode(base64Value);
    } catch (_) {
      return null;
    }
  }

  Widget _section({required String title, required Widget child}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isDark ? AppColors.darkCardBorder : const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }

  Widget _chip(String label, String value) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      constraints: const BoxConstraints(minWidth: 140),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  String? _toAbsoluteMediaUrl(String? fileUrl) {
    if (fileUrl == null || fileUrl.isEmpty) {
      return null;
    }
    if (fileUrl.startsWith('data:')) {
      return fileUrl;
    }
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return fileUrl;
    }
    return 'https://trust.supplymax.net${fileUrl.startsWith('/') ? '' : '/'}$fileUrl';
  }

  bool _isImageMedia(Map<String, dynamic> entry) {
    final mediaType = (entry['type'] as String? ?? '').toLowerCase();
    return mediaType == 'image' || mediaType == 'photo';
  }

  bool _isVideoMedia(Map<String, dynamic> entry) {
    final mediaType = (entry['type'] as String? ?? '').toLowerCase();
    return mediaType == 'video';
  }

  int? _resolveScore(Map<String, dynamic> report, Map<String, dynamic> aiAnalysis) {
    num? rawScore;
    if (aiAnalysis['score'] is num) {
      rawScore = aiAnalysis['score'] as num;
    } else if (report['score'] is num) {
      rawScore = report['score'] as num;
    } else {
      final summary = report['summary'];
      if (summary is Map<String, dynamic> && summary['score'] is num) {
        rawScore = summary['score'] as num;
      }
    }

    if (rawScore == null) return null;
    final normalized = rawScore <= 1 ? rawScore * 100 : rawScore;
    return normalized.round().clamp(0, 100) as int;
  }

  String _scoreLabel(int? score) {
    if (score == null) return 'Sin score';
    if (score >= 80) return 'Salud operativa alta';
    if (score >= 60) return 'Atención prioritaria';
    return 'Riesgo crítico';
  }

  Color _scoreColor(int? score) {
    if (score == null) return const Color(0xFF94A3B8);
    if (score >= 80) return const Color(0xFF22C55E);
    if (score >= 60) return const Color(0xFFF59E0B);
    return const Color(0xFFEF4444);
  }
}

class _PhotoEvidenceViewer extends StatelessWidget {
  const _PhotoEvidenceViewer({required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black,
      child: Stack(
        children: [
          Positioned.fill(
            child: InteractiveViewer(
              minScale: 0.8,
              maxScale: 4,
              child: Image.network(
                url,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => const Center(
                  child: Icon(Icons.broken_image_outlined, color: Colors.white, size: 40),
                ),
              ),
            ),
          ),
          const _ClosePopupButton(),
        ],
      ),
    );
  }
}

class _VideoEvidencePlayer extends StatefulWidget {
  const _VideoEvidencePlayer({required this.url});

  final String url;

  @override
  State<_VideoEvidencePlayer> createState() => _VideoEvidencePlayerState();
}

class _VideoEvidencePlayerState extends State<_VideoEvidencePlayer> {
  late final VideoPlayerController _controller;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.networkUrl(Uri.parse(widget.url))
      ..initialize().then((_) {
        if (!mounted) return;
        setState(() => _initialized = true);
        _controller.play();
      });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black,
      child: Stack(
        children: [
          Positioned.fill(
            child: _initialized
                ? FittedBox(
                    fit: BoxFit.contain,
                    child: SizedBox(
                      width: _controller.value.size.width,
                      height: _controller.value.size.height,
                      child: VideoPlayer(_controller),
                    ),
                  )
                : const Center(child: CircularProgressIndicator()),
          ),
          Positioned(
            bottom: 12,
            left: 12,
            child: FloatingActionButton.small(
              heroTag: null,
              backgroundColor: Colors.black54,
              onPressed: () {
                if (!_initialized) return;
                setState(() {
                  if (_controller.value.isPlaying) {
                    _controller.pause();
                  } else {
                    _controller.play();
                  }
                });
              },
              child: Icon(
                _controller.value.isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
              ),
            ),
          ),
          const _ClosePopupButton(),
        ],
      ),
    );
  }
}

class _ClosePopupButton extends StatelessWidget {
  const _ClosePopupButton();

  @override
  Widget build(BuildContext context) {
    return Positioned(
      right: 10,
      top: 10,
      child: IconButton(
        style: IconButton.styleFrom(backgroundColor: Colors.black54),
        onPressed: () => Navigator.of(context).pop(),
        icon: const Icon(Icons.close_rounded, color: Colors.white),
      ),
    );
  }
}
