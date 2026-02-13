import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:printing/printing.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/trust_repository.dart';

class VisitReportScreen extends StatefulWidget {
  const VisitReportScreen({
    required this.visitId,
    required this.email,
    this.openWithDownload = false,
    super.key,
  });

  final int visitId;
  final String email;
  final bool openWithDownload;

  @override
  State<VisitReportScreen> createState() => _VisitReportScreenState();
}

class _VisitReportScreenState extends State<VisitReportScreen> {
  final TrustRepository _repository = TrustRepository();

  bool _isLoading = true;
  bool _isDownloadingPdf = false;
  String? _error;
  Map<String, dynamic>? _visit;
  List<Map<String, dynamic>> _dispensers = const [];

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

      final result = await _repository.loadVisitReportData(
        email: widget.email,
        visitId: widget.visitId,
      );

      if (!mounted) return;
      setState(() {
        _visit = result.visit;
        _dispensers = result.dispensers;
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
      final bytes = await _repository.downloadVisitReportPdf(
        email: widget.email,
        visitId: widget.visitId,
      );
      await Printing.sharePdf(bytes: bytes, filename: 'visita-${widget.visitId}-informe.pdf');
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

    if (_error != null || _visit == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Informe de visita')),
        body: Center(child: Text(_error ?? 'No se encontró la visita.')),
      );
    }

    final visit = _visit!;
    final report = (visit['visit_report'] as Map<String, dynamic>?) ?? const {};
    final checklist = (report['checklist'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .toList(growable: false);
    final media = (visit['media'] as List<dynamic>? ?? const []).whereType<Map<String, dynamic>>().toList(growable: false);
    final photos = media.where((entry) => (entry['type'] as String? ?? '') == 'image').toList(growable: false);
    final videos = media.where((entry) => (entry['type'] as String? ?? '') == 'video').toList(growable: false);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Informe de visita'),
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
                  _chip('Visita', '#${visit['id'] ?? '--'}'),
                  _chip('Cliente', '${visit['client'] ?? 'Sin cliente'}'),
                  _chip('Sucursal', '${visit['branch'] ?? 'Sin sucursal'}'),
                  _chip('Área', _readAreaName(visit['area'])),
                  _chip('Inspector', '${visit['inspector'] ?? 'Sin inspector'}'),
                  _chip('Estado', (visit['status'] as String? ?? '').contains('completed') ? 'Finalizada' : 'Programada'),
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
                  const SizedBox(height: 12),
                  _buildResponsibleSignature(report['responsible_signature'] as String?),
                ],
              ),
            ),
            _section(
              title: 'Checklist',
              child: checklist.isEmpty
                  ? const Text('No hay checklist registrado.')
                  : Column(
                      children: checklist
                          .map(
                            (item) => ListTile(
                              dense: true,
                              contentPadding: EdgeInsets.zero,
                              leading: Icon(
                                item['checked'] == true ? Icons.check_circle : Icons.radio_button_unchecked,
                                color: item['checked'] == true ? Colors.green : Colors.grey,
                              ),
                              title: Text('${item['label'] ?? 'Sin etiqueta'}'),
                              subtitle: Text('${item['location'] ?? 'Sin ubicación'}'),
                            ),
                          )
                          .toList(growable: false),
                    ),
            ),
            _section(
              title: 'Dosificadores (modelo y productos)',
              child: _dispensers.isEmpty
                  ? const Text('No hay dosificadores registrados.')
                  : Column(
                      children: _dispensers
                          .map((item) => _buildDispenserCard(item))
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
        color: const Color(0xFFF8FAFC),
        padding: const EdgeInsets.all(10),
        child: Image.memory(
          imageBytes,
          height: 120,
          fit: BoxFit.contain,
        ),
      ),
    );
  }

  Widget _buildDispenserCard(Map<String, dynamic> item) {
    final model = item['model'];
    final products = (item['products'] as List<dynamic>? ?? const []).whereType<Map<String, dynamic>>().toList(growable: false);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ListTile(
            dense: true,
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.local_drink_outlined),
            title: Text('${item['identifier'] ?? 'Sin código'}'),
            subtitle: Text('${model is Map<String, dynamic> ? model['name'] : 'Sin modelo'}'),
          ),
          if (model is Map<String, dynamic>)
            _photoTile(
              title: 'Foto del modelo',
              photoUrl: _toAbsoluteMediaUrl(model['photo'] as String?),
            ),
          const SizedBox(height: 8),
          const Text('Productos', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          if (products.isEmpty)
            const Text('Sin productos asignados.')
          else
            Column(
              children: products
                  .map(
                    (product) => _photoTile(
                      title: '${product['name'] ?? 'Producto'}',
                      photoUrl: _toAbsoluteMediaUrl(product['photo'] as String?),
                    ),
                  )
                  .toList(growable: false),
            ),
        ],
      ),
    );
  }

  Widget _photoTile({required String title, required String? photoUrl}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Container(
              width: 52,
              height: 52,
              color: const Color(0xFFE5E7EB),
              child: photoUrl == null
                  ? const Icon(Icons.image_not_supported_outlined, size: 18)
                  : Image.network(
                      photoUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const Icon(Icons.broken_image_outlined),
                    ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(child: Text(title)),
        ],
      ),
    );
  }

  Widget _buildMediaGallery(List<Map<String, dynamic>> items, {required bool isVideo}) {
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
                color: const Color(0xFFF3F4F6),
                child: InkWell(
                  onTap: url == null ? null : () => _openExternalMedia(url),
                  child: url == null
                      ? Icon(isVideo ? Icons.videocam_off_outlined : Icons.image_not_supported_outlined)
                      : Stack(
                          fit: StackFit.expand,
                          children: [
                            if (isVideo)
                              Container(
                                color: const Color(0xFFE5E7EB),
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

  Future<void> _openExternalMedia(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return;

    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo abrir el archivo.')),
      );
    }
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

  String _readAreaName(Object? rawArea) {
    if (rawArea is Map<String, dynamic>) {
      return rawArea['name'] as String? ?? 'Sin área';
    }
    if (rawArea is String && rawArea.trim().isNotEmpty) {
      return rawArea;
    }
    return 'Sin área';
  }

  Widget _section({required String title, required Widget child}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E7EB)),
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
    return Container(
      constraints: const BoxConstraints(minWidth: 140),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
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
}
