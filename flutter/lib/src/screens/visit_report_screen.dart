import 'package:flutter/material.dart';
import 'package:printing/printing.dart';

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
    final photos = (visit['media'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .where((entry) => (entry['type'] as String? ?? '') == 'image')
        .toList(growable: false);

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
                  if (report['responsible_signature'] != null)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        '${report['responsible_signature']}',
                        height: 120,
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                      ),
                    ),
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
              title: 'Dosificadores',
              child: _dispensers.isEmpty
                  ? const Text('No hay dosificadores registrados.')
                  : Column(
                      children: _dispensers
                          .map(
                            (item) => ListTile(
                              dense: true,
                              contentPadding: EdgeInsets.zero,
                              leading: const Icon(Icons.local_drink_outlined),
                              title: Text('${item['identifier'] ?? 'Sin código'}'),
                              subtitle: Text('${item['model']?['name'] ?? 'Sin modelo'}'),
                            ),
                          )
                          .toList(growable: false),
                    ),
            ),
            _section(
              title: 'Evidencias fotográficas',
              child: photos.isEmpty
                  ? const Text('No hay evidencias registradas.')
                  : SizedBox(
                      height: 120,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: photos.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 10),
                        itemBuilder: (context, index) {
                          final url = _toAbsoluteMediaUrl(photos[index]['file'] as String?);
                          return AspectRatio(
                            aspectRatio: 1,
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                color: const Color(0xFFF3F4F6),
                                child: url == null
                                    ? const Icon(Icons.image_not_supported_outlined)
                                    : Image.network(url, fit: BoxFit.cover),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
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
