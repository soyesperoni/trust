import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../../models/incident.dart';
import '../../services/trust_repository.dart';

class IncidentDetailScreen extends StatefulWidget {
  const IncidentDetailScreen({
    required this.email,
    required this.incidentId,
    super.key,
  });

  final String email;
  final int incidentId;

  @override
  State<IncidentDetailScreen> createState() => _IncidentDetailScreenState();
}

class _IncidentDetailScreenState extends State<IncidentDetailScreen> {
  final TrustRepository _repository = TrustRepository();

  bool _isLoading = true;
  String? _error;
  Incident? _incident;

  @override
  void initState() {
    super.initState();
    _loadIncident();
  }

  Future<void> _loadIncident() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });
      final incident = await _repository.loadIncidentById(
        email: widget.email,
        incidentId: widget.incidentId,
      );
      if (!mounted) return;
      setState(() => _incident = incident);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final incident = _incident;

    return Scaffold(
      appBar: AppBar(title: const Text('Detalle de la incidencia')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : incident == null
                  ? const Center(child: Text('No se encontró la incidencia.'))
                  : RefreshIndicator(
                      onRefresh: _loadIncident,
                      child: ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          _section(
                            title: 'Información general',
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('ID: #INC-${incident.id}'),
                                Text('Cliente: ${incident.client}'),
                                Text('Sucursal: ${incident.branch}'),
                                Text('Área: ${incident.area}'),
                                Text('Dosificador: ${incident.dispenser}'),
                                Text('Creación: ${_friendlyDate(incident.createdAt)}'),
                                const SizedBox(height: 8),
                                Text('Descripción: ${incident.description.isEmpty ? 'Sin descripción' : incident.description}'),
                              ],
                            ),
                          ),
                          _section(
                            title: 'Evidencias fotográficas',
                            child: _buildImages(incident.media.where((m) => m.type == 'photo' && m.file != null).toList()),
                          ),
                          _section(
                            title: 'Evidencias en video',
                            child: _buildVideos(incident.media.where((m) => m.type == 'video' && m.file != null).toList()),
                          ),
                        ],
                      ),
                    ),
    );
  }

  Widget _section({required String title, required Widget child}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }

  Widget _buildImages(List<IncidentMedia> media) {
    if (media.isEmpty) return const Text('No hay fotos registradas.');
    return Column(
      children: media
          .map((entry) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Image.network(_toAbsoluteMediaUrl(entry.file!), fit: BoxFit.cover),
                ),
              ))
          .toList(growable: false),
    );
  }

  Widget _buildVideos(List<IncidentMedia> media) {
    if (media.isEmpty) return const Text('No hay videos registrados.');
    return Column(
      children: media
          .map((entry) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _InlineVideoPlayer(url: _toAbsoluteMediaUrl(entry.file!)),
              ))
          .toList(growable: false),
    );
  }

  String _toAbsoluteMediaUrl(String value) {
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    return 'http://localhost:8000${value.startsWith('/') ? value : '/$value'}';
  }

  static String _friendlyDate(String raw) {
    final date = DateTime.tryParse(raw)?.toLocal();
    if (date == null) return raw;
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}

class _InlineVideoPlayer extends StatefulWidget {
  const _InlineVideoPlayer({required this.url});
  final String url;

  @override
  State<_InlineVideoPlayer> createState() => _InlineVideoPlayerState();
}

class _InlineVideoPlayerState extends State<_InlineVideoPlayer> {
  VideoPlayerController? _controller;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.networkUrl(Uri.parse(widget.url))
      ..initialize().then((_) {
        if (mounted) setState(() {});
      });
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) {
      return const SizedBox(height: 200, child: Center(child: CircularProgressIndicator()));
    }
    return AspectRatio(
      aspectRatio: controller.value.aspectRatio,
      child: Stack(
        children: [
          VideoPlayer(controller),
          Positioned(
            right: 8,
            bottom: 8,
            child: IconButton(
              onPressed: () {
                setState(() {
                  controller.value.isPlaying ? controller.pause() : controller.play();
                });
              },
              icon: Icon(controller.value.isPlaying ? Icons.pause_circle : Icons.play_circle, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}
