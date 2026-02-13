import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:mime/mime.dart';

import '../../services/trust_repository.dart';

class NewIncidentScreen extends StatefulWidget {
  const NewIncidentScreen({required this.email, super.key});

  final String email;

  @override
  State<NewIncidentScreen> createState() => _NewIncidentScreenState();
}

class _NewIncidentScreenState extends State<NewIncidentScreen> {
  final TrustRepository _repository = TrustRepository();

  int _step = 0;
  bool _loading = true;
  bool _submitting = false;
  String? _error;

  List<Map<String, dynamic>> _clients = const [];
  List<Map<String, dynamic>> _branches = const [];
  List<Map<String, dynamic>> _areas = const [];
  List<Map<String, dynamic>> _dispensers = const [];

  int? _clientId;
  int? _branchId;
  int? _areaId;
  int? _dispenserId;
  final TextEditingController _descriptionController = TextEditingController();
  final List<File> _evidenceFiles = [];

  static const _primaryColor = Color(0xFFFACC15);
  static const _textPrimary = Color(0xFF0F172A);
  static const _textSecondary = Color(0xFF64748B);

  @override
  void initState() {
    super.initState();
    _loadCatalogs();
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> get _filteredBranches => _branches
      .where((b) => _clientId == null || ((b['client'] as Map<String, dynamic>?)?['id'] as int?) == _clientId)
      .toList(growable: false);

  List<Map<String, dynamic>> get _filteredAreas => _areas
      .where((a) => _branchId == null || ((a['branch'] as Map<String, dynamic>?)?['id'] as int?) == _branchId)
      .toList(growable: false);

  List<Map<String, dynamic>> get _filteredDispensers => _dispensers.where((d) {
        final area = d['area'] as Map<String, dynamic>?;
        final areaId = area?['id'] as int?;
        return _areaId == null || areaId == _areaId;
      }).toList(growable: false);

  Future<void> _loadCatalogs() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _repository.loadClients(widget.email),
        _repository.loadBranches(widget.email),
        _repository.loadAreas(widget.email),
        _repository.loadDispensers(widget.email),
      ]);

      if (!mounted) return;
      setState(() {
        _clients = results[0];
        _branches = results[1];
        _areas = results[2];
        _dispensers = results[3];
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  bool get _canContinue {
    if (_step == 0) {
      return _clientId != null && _branchId != null && _areaId != null && _dispenserId != null;
    }
    return _descriptionController.text.trim().isNotEmpty;
  }

  InputDecoration _mobileInputDecoration(String label) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: Color(0xFF334155), fontWeight: FontWeight.w600),
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFD1D5DB)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFD1D5DB)),
      ),
      disabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: _primaryColor, width: 1.8),
      ),
    );
  }

  Future<void> _openEvidenceCapture() async {
    final mode = await showModalBottomSheet<_EvidenceMode>(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Capturar evidencia', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
                const SizedBox(height: 6),
                const Text('Selecciona el tipo de captura.', style: TextStyle(color: _textSecondary)),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.of(context).pop(_EvidenceMode.photo),
                        child: const Text('Foto'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.of(context).pop(_EvidenceMode.video),
                        child: const Text('Video'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );

    if (mode == null || !mounted) return;

    try {
      final file = await showDialog<XFile>(
        context: context,
        barrierDismissible: false,
        builder: (_) => _IncidentCameraDialog(mode: mode),
      );
      if (file != null && mounted) {
        setState(() => _evidenceFiles.add(File(file.path)));
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo abrir la cámara.')),
      );
    }
  }

  Future<void> _submit() async {
    if (_clientId == null || _branchId == null || _areaId == null || _dispenserId == null) {
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final files = <http.MultipartFile>[];
      for (var i = 0; i < _evidenceFiles.length; i++) {
        final file = _evidenceFiles[i];
        final bytes = await file.readAsBytes();
        final mimeType = lookupMimeType(file.path, headerBytes: _headerBytes(bytes));
        final mimeParts = mimeType?.split('/');
        final mediaType = mimeParts != null && mimeParts.length == 2 ? MediaType(mimeParts[0], mimeParts[1]) : null;

        files.add(
          http.MultipartFile.fromBytes(
            'evidence_files',
            bytes,
            filename: 'evidencia_${DateTime.now().millisecondsSinceEpoch}_$i.${_fileExtension(file.path)}',
            contentType: mediaType,
          ),
        );
      }

      await _repository.createIncident(
        email: widget.email,
        clientId: _clientId!,
        branchId: _branchId!,
        areaId: _areaId!,
        dispenserId: _dispenserId!,
        description: _descriptionController.text.trim(),
        evidenceFiles: files,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Incidencia registrada correctamente.')),
      );
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final progressValue = (_step + 1) / 2;

    return Scaffold(
      backgroundColor: Colors.white,
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 18, 16, 0),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Paso ${_step + 1} de 2',
                                style: const TextStyle(
                                  color: _primaryColor,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.8,
                                ),
                              ),
                              Text(
                                '${(progressValue * 100).round()}%',
                                style: const TextStyle(color: _textSecondary, fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(999),
                            child: LinearProgressIndicator(
                              value: progressValue,
                              minHeight: 6,
                              backgroundColor: const Color(0xFFE2E8F0),
                              valueColor: const AlwaysStoppedAnimation<Color>(_primaryColor),
                            ),
                          ),
                          const SizedBox(height: 16),
                          if (_error != null)
                            Container(
                              width: double.infinity,
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF2F2),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFFECACA)),
                              ),
                              child: Text(_error!, style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13)),
                            ),
                          Expanded(child: _buildStep()),
                        ],
                      ),
                    ),
                  ),
                  Container(
                    decoration: const BoxDecoration(
                      border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
                    ),
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                    child: Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: _submitting
                                ? null
                                : () {
                                    if (_step == 0) {
                                      Navigator.of(context).pop();
                                      return;
                                    }
                                    setState(() => _step -= 1);
                                  },
                            child: Text(_step == 0 ? 'Cancelar' : 'Atrás'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: FilledButton(
                            onPressed: !_canContinue || _submitting
                                ? null
                                : () {
                                    if (_step < 1) {
                                      setState(() => _step += 1);
                                    } else {
                                      _submit();
                                    }
                                  },
                            child: Text(_step < 1 ? 'Siguiente' : (_submitting ? 'Guardando...' : 'Finalizar incidencia')),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildStep() {
    if (_step == 0) {
      return ListView(
        children: [
          const Text('Seleccionar ubicación', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: _textPrimary)),
          const SizedBox(height: 8),
          const Text(
            'Selecciona cliente, sucursal, área y dispensador para asignar la incidencia.',
            style: TextStyle(fontSize: 15, color: _textSecondary),
          ),
          const SizedBox(height: 20),
          DropdownButtonFormField<int>(
            value: _clientId,
            decoration: _mobileInputDecoration('Cliente'),
            items: _clients
                .map((c) => DropdownMenuItem<int>(value: c['id'] as int?, child: Text(c['name'] as String? ?? 'Cliente')))
                .toList(growable: false),
            onChanged: (value) {
              setState(() {
                _clientId = value;
                _branchId = null;
                _areaId = null;
                _dispenserId = null;
              });
            },
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<int>(
            value: _branchId,
            decoration: _mobileInputDecoration('Sucursal'),
            items: _filteredBranches
                .map((b) => DropdownMenuItem<int>(value: b['id'] as int?, child: Text(b['name'] as String? ?? 'Sucursal')))
                .toList(growable: false),
            onChanged: _clientId == null
                ? null
                : (value) {
                    setState(() {
                      _branchId = value;
                      _areaId = null;
                      _dispenserId = null;
                    });
                  },
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<int>(
            value: _areaId,
            decoration: _mobileInputDecoration('Área'),
            items: _filteredAreas
                .map((a) => DropdownMenuItem<int>(value: a['id'] as int?, child: Text(a['name'] as String? ?? 'Área')))
                .toList(growable: false),
            onChanged: _branchId == null
                ? null
                : (value) {
                    setState(() {
                      _areaId = value;
                      _dispenserId = null;
                    });
                  },
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<int>(
            value: _dispenserId,
            decoration: _mobileInputDecoration('Dispensador'),
            items: _filteredDispensers
                .map((d) => DropdownMenuItem<int>(value: d['id'] as int?, child: Text(d['identifier'] as String? ?? 'Dispensador')))
                .toList(growable: false),
            onChanged: _areaId == null ? null : (value) => setState(() => _dispenserId = value),
          ),
        ],
      );
    }

    return ListView(
      children: [
        const Text('Detalles del reporte', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: _textPrimary)),
        const SizedBox(height: 8),
        const Text(
          'Agrega la descripción del incidente y evidencia (foto o video).',
          style: TextStyle(fontSize: 15, color: _textSecondary),
        ),
        const SizedBox(height: 20),
        TextField(
          controller: _descriptionController,
          minLines: 4,
          maxLines: 6,
          onChanged: (_) => setState(() {}),
          decoration: _mobileInputDecoration('Descripción').copyWith(
            hintText: 'Escribe los detalles aquí...',
            alignLabelWithHint: true,
          ),
        ),
        const SizedBox(height: 14),
        InkWell(
          onTap: _evidenceFiles.length >= 4 ? null : _openEvidenceCapture,
          borderRadius: BorderRadius.circular(16),
          child: Ink(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFCBD5E1)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
            child: Column(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: const BoxDecoration(color: Color(0xFFF1F5F9), shape: BoxShape.circle),
                  child: const Icon(Icons.perm_media_outlined, color: Color(0xFF475569), size: 28),
                ),
                const SizedBox(height: 10),
                Text(
                  _evidenceFiles.length >= 4 ? 'Límite de evidencias alcanzado' : 'Agregar evidencia',
                  style: const TextStyle(color: _primaryColor, fontWeight: FontWeight.w700, fontSize: 16),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Captura foto o video directamente en el flujo\n(máx. 4 archivos)',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: _textSecondary, fontSize: 12),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        if (_evidenceFiles.isEmpty)
          const Text('No has agregado evidencias aún.', style: TextStyle(color: _textSecondary))
        else
          ..._evidenceFiles.asMap().entries.map((entry) {
            final index = entry.key;
            final file = entry.value;
            final isVideo = _isVideoFile(file.path);
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: SizedBox(
                      width: 80,
                      height: 80,
                      child: isVideo
                          ? const ColoredBox(
                              color: Color(0xFF0F172A),
                              child: Icon(Icons.videocam, color: Colors.white, size: 30),
                            )
                          : Image.file(file, fit: BoxFit.cover),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      isVideo ? 'Video adjunto' : 'Foto adjunta',
                      style: const TextStyle(fontWeight: FontWeight.w600, color: _textPrimary),
                    ),
                  ),
                  IconButton.filledTonal(
                    onPressed: () => setState(() => _evidenceFiles.removeAt(index)),
                    icon: const Icon(Icons.delete_outline),
                  ),
                ],
              ),
            );
          }),
      ],
    );
  }

  List<int>? _headerBytes(Uint8List bytes) {
    if (bytes.isEmpty) return null;
    final maxLength = bytes.length < 12 ? bytes.length : 12;
    return bytes.sublist(0, maxLength);
  }

  String _fileExtension(String path) {
    final name = path.split('/').last;
    final parts = name.split('.');
    if (parts.length < 2) return 'bin';
    return parts.last.toLowerCase();
  }

  bool _isVideoFile(String path) {
    final mimeType = lookupMimeType(path);
    return mimeType?.startsWith('video/') ?? false;
  }
}

class _IncidentCameraDialog extends StatefulWidget {
  const _IncidentCameraDialog({required this.mode});

  final _EvidenceMode mode;

  @override
  State<_IncidentCameraDialog> createState() => _IncidentCameraDialogState();
}

class _IncidentCameraDialogState extends State<_IncidentCameraDialog> {
  static const Duration _maxVideoDuration = Duration(seconds: 30);

  CameraController? _controller;
  bool _initializing = true;
  bool _capturing = false;
  bool _recording = false;
  Duration _elapsed = Duration.zero;
  StreamSubscription<int>? _timerSubscription;
  String? _error;

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  @override
  void dispose() {
    _timerSubscription?.cancel();
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _initCamera() async {
    try {
      final cameras = await availableCameras();
      final camera = cameras.firstWhere(
        (item) => item.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );
      final controller = CameraController(
        camera,
        ResolutionPreset.medium,
        enableAudio: widget.mode == _EvidenceMode.video,
      );
      await controller.initialize();
      if (!mounted) return;
      setState(() {
        _controller = controller;
        _initializing = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = 'No se pudo iniciar la cámara: $error';
        _initializing = false;
      });
    }
  }

  Future<void> _capture() async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized || _capturing) return;

    try {
      setState(() {
        _capturing = true;
        _error = null;
      });

      if (widget.mode == _EvidenceMode.photo) {
        final file = await controller.takePicture();
        if (!mounted) return;
        Navigator.of(context).pop(file);
        return;
      }

      if (!_recording) {
        await controller.startVideoRecording();
        if (!mounted) return;
        setState(() {
          _capturing = false;
          _recording = true;
        });
        _startVideoTimer();
        return;
      }

      final file = await controller.stopVideoRecording();
      _timerSubscription?.cancel();
      if (!mounted) return;
      Navigator.of(context).pop(file);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _capturing = false;
        _recording = false;
        _error = 'No se pudo capturar evidencia: $error';
      });
    }
  }

  void _startVideoTimer() {
    _elapsed = Duration.zero;
    _timerSubscription?.cancel();
    _timerSubscription = Stream.periodic(const Duration(seconds: 1), (i) => i + 1)
        .take(_maxVideoDuration.inSeconds)
        .listen((seconds) async {
      if (!mounted || !_recording) return;
      setState(() => _elapsed = Duration(seconds: seconds));
      if (seconds >= _maxVideoDuration.inSeconds) {
        await _capture();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    final canCapture = !_initializing && !_capturing && controller != null && controller.value.isInitialized;

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 430),
        child: SizedBox(
          width: double.infinity,
          height: MediaQuery.sizeOf(context).height * 0.82,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        widget.mode == _EvidenceMode.photo ? 'Mini cámara (Foto)' : 'Mini cámara (Video 30s máx.)',
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                    IconButton(
                      onPressed: _recording ? null : () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: Center(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: AspectRatio(
                        aspectRatio: 9 / 16,
                        child: _initializing
                            ? const Center(child: CircularProgressIndicator())
                            : _error != null
                                ? Center(child: Padding(padding: const EdgeInsets.all(8), child: Text(_error!, textAlign: TextAlign.center)))
                                : CameraPreview(controller!),
                      ),
                    ),
                  ),
                ),
                if (widget.mode == _EvidenceMode.video)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text('Duración: ${_elapsed.inSeconds}s / 30s', style: TextStyle(color: _textSecondary)),
                  ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: canCapture ? _capture : null,
                    icon: Icon(widget.mode == _EvidenceMode.photo ? Icons.camera_alt_outlined : (_recording ? Icons.stop_circle_outlined : Icons.videocam_outlined)),
                    label: Text(widget.mode == _EvidenceMode.photo ? 'Tomar foto' : (_recording ? 'Detener grabación' : 'Iniciar grabación')),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

enum _EvidenceMode { photo, video }
